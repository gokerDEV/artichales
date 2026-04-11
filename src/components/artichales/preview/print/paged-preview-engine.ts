type PagedPreviewerInstance = {
	preview: (
		content: string,
		stylesheets: string[],
		renderTo: HTMLElement,
	) => Promise<unknown>;
};

export type RunPagedPreviewParams = {
	sourceHtml: string;
	stagingHost: HTMLElement;
	mountRoot: HTMLElement;
	pageLimit?: number;
};

export type RunPagedPreviewResult = {
	pageCount: number;
	wasTruncated: boolean;
};

function resolvePagedPreviewerFactory(
	module: unknown,
): (() => PagedPreviewerInstance) | null {
	if (typeof module !== "object" || module === null) return null;
	const candidate = module as {
		Previewer?: new () => PagedPreviewerInstance;
		default?: {
			Previewer?: new () => PagedPreviewerInstance;
		};
	};
	const previewerCtor = candidate.Previewer;
	if (previewerCtor) {
		return () => new previewerCtor();
	}
	const defaultPreviewerCtor = candidate.default?.Previewer;
	if (defaultPreviewerCtor) {
		return () => new defaultPreviewerCtor();
	}
	return null;
}

export async function runPagedPreview({
	sourceHtml,
	stagingHost,
	mountRoot,
	pageLimit,
}: RunPagedPreviewParams): Promise<RunPagedPreviewResult> {
	const pagedModule = await import("pagedjs");
	const createPreviewer = resolvePagedPreviewerFactory(pagedModule);
	if (!createPreviewer) {
		throw new Error("Paged.js Previewer export is unavailable.");
	}

	const previewer = createPreviewer();
	const stagingElement = globalThis.document.createElement("div");
	stagingElement.className = "paged-print-content w-full";
	stagingElement.setAttribute("aria-hidden", "true");
	stagingElement.style.position = "absolute";
	stagingElement.style.left = "-200vw";
	stagingElement.style.top = "0";
	stagingElement.style.visibility = "hidden";
	stagingElement.style.pointerEvents = "none";
	stagingHost.appendChild(stagingElement);

	try {
		await previewer.preview(sourceHtml, [], stagingElement);

		const renderedPages = Array.from(
			stagingElement.querySelectorAll(".pagedjs_page"),
		);
		let wasTruncated = false;
		if (typeof pageLimit === "number" && pageLimit > 0) {
			if (renderedPages.length > pageLimit) {
				for (const page of renderedPages.slice(pageLimit)) {
					page.remove();
				}
				wasTruncated = true;
			}
		}

		const pagedPagesRoot = stagingElement.querySelector(".pagedjs_pages");
		if (pagedPagesRoot) {
			mountRoot.replaceChildren(pagedPagesRoot);
		} else {
			mountRoot.replaceChildren(...Array.from(stagingElement.childNodes));
		}

		return {
			pageCount: renderedPages.length,
			wasTruncated,
		};
	} finally {
		stagingElement.remove();
	}
}
