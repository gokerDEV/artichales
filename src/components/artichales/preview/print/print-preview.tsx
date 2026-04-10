import * as React from "react";
import { DocumentRenderContent } from "@/components/artichales/preview/shared/document-render-content";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DocumentSource } from "@/hooks/use-document";
import { cn } from "@/lib/utils";

export type PrintPreviewProps = {
	document: DocumentSource;
	className?: string;
	scale?: number;
};

type PagedPreviewerInstance = {
	preview: (
		content: string,
		stylesheets: string[],
		renderTo: HTMLElement,
	) => Promise<unknown>;
};

const PAGE_LIMIT = 40;

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

export function PrintPreview({
	document,
	className,
	scale = 100,
}: PrintPreviewProps) {
	const { template } = document;
	const pagedSourceRef = React.useRef<HTMLDivElement | null>(null);
	const pagedPreviewRef = React.useRef<HTMLDivElement | null>(null);
	const renderSequenceRef = React.useRef(0);
	const [pagedStatus, setPagedStatus] = React.useState<
		"idle" | "loading" | "ready" | "error"
	>("idle");
	const [pagedError, setPagedError] = React.useState<string | null>(null);
	const [pagedWasTruncated, setPagedWasTruncated] = React.useState(false);

	const pageConfig = template?.page;
	const margins = pageConfig?.margin;
	const pageHeightPx = pageConfig?.orientation === "landscape" ? 794 : 1123;
	const columnGap = template.layout?.columnGap || "7mm";
	const pagedCss = React.useMemo(() => {
		const orientation =
			pageConfig?.orientation === "landscape" ? "landscape" : "portrait";
		const pageSize = pageConfig?.size || "A4";
		const marginTop = typeof margins?.top === "string" ? margins.top : "24mm";
		const marginRight =
			typeof margins?.right === "string" ? margins.right : "20mm";
		const marginBottom =
			typeof margins?.bottom === "string" ? margins.bottom : "24mm";
		const marginLeft =
			typeof margins?.left === "string" ? margins.left : "20mm";
		const defaultColumns = Math.max(
			1,
			template.layout?.defaultPageColumns || 2,
		);
		const firstPageColumns = Math.max(
			1,
			template.layout?.firstPageColumns || 1,
		);

		return `@page { size: ${pageSize} ${orientation}; margin: ${marginTop} ${marginRight} ${marginBottom} ${marginLeft}; }
.paged-print-content .artichales__body { column-count: ${defaultColumns}; column-gap: ${columnGap}; }
.paged-print-content .pagedjs_first_page .artichales__body { column-count: ${firstPageColumns}; }`;
	}, [
		columnGap,
		margins,
		pageConfig?.orientation,
		pageConfig?.size,
		template.layout,
	]);
	const pagedPreviewKey = React.useMemo(
		() =>
			JSON.stringify({
				content: document.content,
				frontmatter: document.frontmatter,
				template: document.template,
				citations: Object.keys(document.citations).length,
				plots: Object.keys(document.plots).length,
				pagedCss,
			}),
		[
			document.citations,
			document.content,
			document.frontmatter,
			document.plots,
			document.template,
			pagedCss,
		],
	);

	React.useEffect(() => {
		void pagedPreviewKey;
		let cancelled = false;
		const currentSequence = ++renderSequenceRef.current;
		const runPagedPreview = async () => {
			const sourceElement = pagedSourceRef.current;
			const previewElement = pagedPreviewRef.current;
			if (!sourceElement || !previewElement) return;
			setPagedStatus("loading");
			setPagedError(null);
			setPagedWasTruncated(false);
			previewElement.innerHTML = "";

			try {
				const pagedModule = await import("pagedjs");
				const createPreviewer = resolvePagedPreviewerFactory(pagedModule);
				if (!createPreviewer) {
					throw new Error("Paged.js Previewer export is unavailable.");
				}

				const previewer = createPreviewer();
				await previewer.preview(sourceElement.innerHTML, [], previewElement);

				if (
					cancelled ||
					currentSequence !== renderSequenceRef.current ||
					!pagedPreviewRef.current
				) {
					return;
				}

				const renderedPages = Array.from(
					previewElement.querySelectorAll(".pagedjs_page"),
				);
				if (renderedPages.length > PAGE_LIMIT) {
					for (const page of renderedPages.slice(PAGE_LIMIT)) {
						page.remove();
					}
					setPagedWasTruncated(true);
				}
				setPagedStatus("ready");
			} catch (error) {
				console.error("Paged.js preview failed:", error);
				if (cancelled || currentSequence !== renderSequenceRef.current) return;
				setPagedStatus("error");
				setPagedError(
					"Paged.js preview failed. Check browser console for details.",
				);
			}
		};

		runPagedPreview();
		return () => {
			cancelled = true;
		};
	}, [pagedPreviewKey]);

	return (
		<div className={cn("absolute inset-0 bg-neutral-100", className)}>
			<div className="pointer-events-none absolute top-0 -left-[200vw] opacity-0">
				<div ref={pagedSourceRef}>
					<style>{pagedCss}</style>
					<div className="paged-print-content">
						<DocumentRenderContent
							document={document}
							target="print"
							articleClassName="artichales__body"
						/>
					</div>
				</div>
			</div>
			<ScrollArea className="h-full w-full">
				<div
					data-artichales-print-preview-shell="true"
					className="flex w-full flex-col items-center gap-8 p-8 transition-transform duration-200"
					style={{
						transform: `scale(${scale / 100})`,
						transformOrigin: "top center",
						backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${pageHeightPx - 24}px, rgb(226 232 240) ${pageHeightPx - 24}px, rgb(226 232 240) ${pageHeightPx}px)`,
					}}
				>
					{pagedStatus === "loading" || pagedStatus === "idle" ? (
						<div className="w-full max-w-[210mm] border border-muted bg-background p-4 text-muted-foreground text-sm">
							Preparing Paged.js print preview...
						</div>
					) : null}
					{pagedError ? (
						<div className="w-full max-w-[210mm] border border-amber-300 bg-amber-50 p-3 text-amber-800 text-sm">
							{pagedError}
						</div>
					) : null}
					{pagedWasTruncated ? (
						<div className="w-full max-w-[210mm] border border-amber-300 bg-amber-50 p-3 text-amber-800 text-sm">
							Print preview was limited to {PAGE_LIMIT} pages. Reduce content or
							adjust layout to view all pages.
						</div>
					) : null}
					<div
						ref={pagedPreviewRef}
						className="paged-print-content w-full"
						data-artichales-pagedjs-preview="true"
					/>
				</div>
			</ScrollArea>
		</div>
	);
}
