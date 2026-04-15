import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
	ResolvedMarginConfig,
	TemplateResolved,
} from "@/components/artichale/types/template.types";

import "@/components/artichale/base/base.template.print.css";
import "@/components/artichale/base/print.mechanics.css";

export type ArtichaleViewProps = {
	template: TemplateResolved;
	title: ReactNode;
	authors: ReactNode;
	article: ReactNode;
	references: ReactNode;
	enablePaged?: boolean;
	pagedStylesheets?: string[];
	pagedTokens?: Record<string, string | number | undefined>;
};

type PagedPreviewerInstance = {
	preview: (
		source: string | Element,
		stylesheets: string[],
		renderTo: HTMLElement,
	) => Promise<unknown>;
};

function resolvePagedPreviewerFactory(
	moduleCandidate: unknown,
): (() => PagedPreviewerInstance) | null {
	if (!moduleCandidate || typeof moduleCandidate !== "object") return null;
	const record = moduleCandidate as {
		Previewer?: new () => PagedPreviewerInstance;
		default?: {
			Previewer?: new () => PagedPreviewerInstance;
		};
	};
	const previewerCtor = record.Previewer ?? record.default?.Previewer;
	if (!previewerCtor) return null;
	return () => new previewerCtor();
}

function escapeCssContent(value: string): string {
	return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function resolveTokenValue(input: {
	tokenName: string;
	template: TemplateResolved;
	tokens?: Record<string, string | number | undefined>;
	pageNumber?: number;
	totalPages?: number;
}): string {
	if (input.tokenName === "pageNumber") {
		return typeof input.pageNumber === "number" ? String(input.pageNumber) : "";
	}
	if (input.tokenName === "totalPages") {
		return typeof input.totalPages === "number" ? String(input.totalPages) : "";
	}
	if (input.tokenName === "publisherName") {
		return input.template.publisher.name ?? "";
	}
	const value = input.tokens?.[input.tokenName];
	if (value === undefined || value === null) return "";
	return String(value);
}

function formatMarginContentForCss(input: {
	template: TemplateResolved;
	value: string | undefined;
	tokens?: Record<string, string | number | undefined>;
}): string {
	if (!input.value || input.value.trim() === "") return "none";
	const pieces = input.value.split(/(\{.*?\})/g).filter(Boolean);
	const cssParts = pieces.map((piece) => {
		if (piece === "{pageNumber}") return "counter(page)";
		if (piece === "{totalPages}") return "counter(pages)";
		if (piece.startsWith("{") && piece.endsWith("}")) {
			const tokenName = piece.slice(1, -1).trim();
			const resolved = resolveTokenValue({
				tokenName,
				template: input.template,
				tokens: input.tokens,
			});
			return `"${escapeCssContent(resolved)}"`;
		}
		return `"${escapeCssContent(piece)}"`;
	});
	return cssParts.join(" ");
}

function formatMarginContentForText(input: {
	template: TemplateResolved;
	value: string | undefined;
	tokens?: Record<string, string | number | undefined>;
	pageNumber: number;
	totalPages: number;
}): string {
	if (!input.value || input.value.trim() === "") return "";
	return input.value.replace(/\{(.*?)\}/g, (_, rawToken: string) => {
		const tokenName = rawToken.trim();
		return resolveTokenValue({
			tokenName,
			template: input.template,
			tokens: input.tokens,
			pageNumber: input.pageNumber,
			totalPages: input.totalPages,
		});
	});
}

function buildHorizontalMarginCss(input: {
	template: TemplateResolved;
	tokens?: Record<string, string | number | undefined>;
	pageSelector: ":first" | ":left" | ":right";
	state: "first" | "odd" | "even";
	config: ResolvedMarginConfig;
	location: "top" | "bottom";
}): string {
	if (!input.config.enabled) return "";
	const segment = input.config[input.state];
	return `
@page ${input.pageSelector} {
	@${input.location}-left {
		content: ${formatMarginContentForCss({ template: input.template, value: segment.left, tokens: input.tokens })};
		text-align: left;
		font-size: 9pt;
		color: #4b5563;
	}
	@${input.location}-center {
		content: ${formatMarginContentForCss({ template: input.template, value: segment.center, tokens: input.tokens })};
		text-align: center;
		font-size: 9pt;
		color: #4b5563;
	}
	@${input.location}-right {
		content: ${formatMarginContentForCss({ template: input.template, value: segment.right, tokens: input.tokens })};
		text-align: right;
		font-size: 9pt;
		color: #4b5563;
	}
}`;
}

function buildVerticalMarginCss(input: {
	template: TemplateResolved;
	tokens?: Record<string, string | number | undefined>;
	pageSelector: ":first" | ":left" | ":right";
	state: "first" | "odd" | "even";
	config: ResolvedMarginConfig;
	side: "left" | "right";
}): string {
	if (!input.config.enabled) return "";
	const segment = input.config[input.state];
	const locationPrefix = input.side === "left" ? "left" : "right";
	const rotateCss =
		input.side === "left" ? "transform: rotate(180deg);" : "transform: none;";
	return `
@page ${input.pageSelector} {
	@${locationPrefix}-top {
		content: ${formatMarginContentForCss({ template: input.template, value: segment.left, tokens: input.tokens })};
		writing-mode: vertical-rl;
		${rotateCss}
		font-size: 9pt;
		color: #4b5563;
	}
	@${locationPrefix}-middle {
		content: ${formatMarginContentForCss({ template: input.template, value: segment.center, tokens: input.tokens })};
		writing-mode: vertical-rl;
		${rotateCss}
		font-size: 9pt;
		color: #4b5563;
	}
	@${locationPrefix}-bottom {
		content: ${formatMarginContentForCss({ template: input.template, value: segment.right, tokens: input.tokens })};
		writing-mode: vertical-rl;
		${rotateCss}
		font-size: 9pt;
		color: #4b5563;
	}
}`;
}

function buildArtichalePagedStylesheet(input: {
	template: TemplateResolved;
	tokens?: Record<string, string | number | undefined>;
}): string {
	const page = input.template.print.page;
	const layout = input.template.print.layout;
	const pageMargins = input.template.print.pageMargins;
	const orientation =
		page.orientation === "landscape" ? "landscape" : "portrait";

	const headerCss = [
		buildHorizontalMarginCss({
			template: input.template,
			tokens: input.tokens,
			pageSelector: ":first",
			state: "first",
			config: pageMargins.header,
			location: "top",
		}),
		buildHorizontalMarginCss({
			template: input.template,
			tokens: input.tokens,
			pageSelector: ":left",
			state: "even",
			config: pageMargins.header,
			location: "top",
		}),
		buildHorizontalMarginCss({
			template: input.template,
			tokens: input.tokens,
			pageSelector: ":right",
			state: "odd",
			config: pageMargins.header,
			location: "top",
		}),
	].join("\n");

	const footerCss = [
		buildHorizontalMarginCss({
			template: input.template,
			tokens: input.tokens,
			pageSelector: ":first",
			state: "first",
			config: pageMargins.footer,
			location: "bottom",
		}),
		buildHorizontalMarginCss({
			template: input.template,
			tokens: input.tokens,
			pageSelector: ":left",
			state: "even",
			config: pageMargins.footer,
			location: "bottom",
		}),
		buildHorizontalMarginCss({
			template: input.template,
			tokens: input.tokens,
			pageSelector: ":right",
			state: "odd",
			config: pageMargins.footer,
			location: "bottom",
		}),
	].join("\n");

	const leftCss = [
		buildVerticalMarginCss({
			template: input.template,
			tokens: input.tokens,
			pageSelector: ":first",
			state: "first",
			config: pageMargins.left,
			side: "left",
		}),
		buildVerticalMarginCss({
			template: input.template,
			tokens: input.tokens,
			pageSelector: ":left",
			state: "even",
			config: pageMargins.left,
			side: "left",
		}),
		buildVerticalMarginCss({
			template: input.template,
			tokens: input.tokens,
			pageSelector: ":right",
			state: "odd",
			config: pageMargins.left,
			side: "left",
		}),
	].join("\n");

	const rightCss = [
		buildVerticalMarginCss({
			template: input.template,
			tokens: input.tokens,
			pageSelector: ":first",
			state: "first",
			config: pageMargins.right,
			side: "right",
		}),
		buildVerticalMarginCss({
			template: input.template,
			tokens: input.tokens,
			pageSelector: ":left",
			state: "even",
			config: pageMargins.right,
			side: "right",
		}),
		buildVerticalMarginCss({
			template: input.template,
			tokens: input.tokens,
			pageSelector: ":right",
			state: "odd",
			config: pageMargins.right,
			side: "right",
		}),
	].join("\n");

	return `
@page {
	size: ${page.size} ${orientation};
	margin: ${page.margin.top} ${page.margin.right} ${page.margin.bottom} ${page.margin.left};
}

.paged-print-content .art--print article,
.paged-print-content article {
	column-count: ${Math.max(1, layout.defaultPageColumns)};
	column-gap: ${layout.columnGap};
}

.paged-print-content .pagedjs_first_page .art--print article,
.paged-print-content .pagedjs_first_page article {
	column-count: ${Math.max(1, layout.firstPageColumns)};
}

${headerCss}
${footerCss}
${leftCss}
${rightCss}
`;
}

function setMarginText(
	lastPage: Element,
	selector: string,
	text: string,
): void {
	const marginContent = lastPage.querySelector(
		`${selector} .pagedjs_margin-content`,
	);
	if (!(marginContent instanceof HTMLElement)) return;
	marginContent.textContent = text;
	marginContent.classList.add("hasContent");
}

function applyLastPageMarginOverrides(input: {
	mountRoot: HTMLElement;
	template: TemplateResolved;
	tokens?: Record<string, string | number | undefined>;
}): void {
	const lastPage = input.mountRoot.querySelector(".pagedjs_page:last-child");
	if (!lastPage) return;
	const pageCount = input.mountRoot.querySelectorAll(".pagedjs_page").length;
	if (pageCount === 0) return;

	const { pageMargins } = input.template.print;
	const pageNumber = pageCount;
	const totalPages = pageCount;

	if (pageMargins.header.enabled) {
		setMarginText(
			lastPage,
			".pagedjs_margin-top-left",
			formatMarginContentForText({
				template: input.template,
				value: pageMargins.header.last.left,
				tokens: input.tokens,
				pageNumber,
				totalPages,
			}),
		);
		setMarginText(
			lastPage,
			".pagedjs_margin-top-center",
			formatMarginContentForText({
				template: input.template,
				value: pageMargins.header.last.center,
				tokens: input.tokens,
				pageNumber,
				totalPages,
			}),
		);
		setMarginText(
			lastPage,
			".pagedjs_margin-top-right",
			formatMarginContentForText({
				template: input.template,
				value: pageMargins.header.last.right,
				tokens: input.tokens,
				pageNumber,
				totalPages,
			}),
		);
	}

	if (pageMargins.footer.enabled) {
		setMarginText(
			lastPage,
			".pagedjs_margin-bottom-left",
			formatMarginContentForText({
				template: input.template,
				value: pageMargins.footer.last.left,
				tokens: input.tokens,
				pageNumber,
				totalPages,
			}),
		);
		setMarginText(
			lastPage,
			".pagedjs_margin-bottom-center",
			formatMarginContentForText({
				template: input.template,
				value: pageMargins.footer.last.center,
				tokens: input.tokens,
				pageNumber,
				totalPages,
			}),
		);
		setMarginText(
			lastPage,
			".pagedjs_margin-bottom-right",
			formatMarginContentForText({
				template: input.template,
				value: pageMargins.footer.last.right,
				tokens: input.tokens,
				pageNumber,
				totalPages,
			}),
		);
	}

	if (pageMargins.left.enabled) {
		setMarginText(
			lastPage,
			".pagedjs_margin-left-top",
			formatMarginContentForText({
				template: input.template,
				value: pageMargins.left.last.left,
				tokens: input.tokens,
				pageNumber,
				totalPages,
			}),
		);
		setMarginText(
			lastPage,
			".pagedjs_margin-left-middle",
			formatMarginContentForText({
				template: input.template,
				value: pageMargins.left.last.center,
				tokens: input.tokens,
				pageNumber,
				totalPages,
			}),
		);
		setMarginText(
			lastPage,
			".pagedjs_margin-left-bottom",
			formatMarginContentForText({
				template: input.template,
				value: pageMargins.left.last.right,
				tokens: input.tokens,
				pageNumber,
				totalPages,
			}),
		);
	}

	if (pageMargins.right.enabled) {
		setMarginText(
			lastPage,
			".pagedjs_margin-right-top",
			formatMarginContentForText({
				template: input.template,
				value: pageMargins.right.last.left,
				tokens: input.tokens,
				pageNumber,
				totalPages,
			}),
		);
		setMarginText(
			lastPage,
			".pagedjs_margin-right-middle",
			formatMarginContentForText({
				template: input.template,
				value: pageMargins.right.last.center,
				tokens: input.tokens,
				pageNumber,
				totalPages,
			}),
		);
		setMarginText(
			lastPage,
			".pagedjs_margin-right-bottom",
			formatMarginContentForText({
				template: input.template,
				value: pageMargins.right.last.right,
				tokens: input.tokens,
				pageNumber,
				totalPages,
			}),
		);
	}
}

async function runArtichalePagedLayout(input: {
	sourceRoot: HTMLElement;
	mountRoot: HTMLElement;
	stylesheets?: string[];
	template: TemplateResolved;
	tokens?: Record<string, string | number | undefined>;
}): Promise<void> {
	const pagedModule = await import("pagedjs");
	const createPreviewer = resolvePagedPreviewerFactory(pagedModule);
	if (!createPreviewer) {
		throw new Error("Paged.js Previewer export is unavailable.");
	}

	const previewer = createPreviewer();
	const stagingElement = document.createElement("div");
	stagingElement.className = "paged-print-content";

	await previewer.preview(
		input.sourceRoot.innerHTML,
		input.stylesheets ?? [],
		stagingElement,
	);

	const pagesRoot = stagingElement.querySelector(".pagedjs_pages");
	if (pagesRoot) {
		input.mountRoot.replaceChildren(pagesRoot);
		applyLastPageMarginOverrides({
			mountRoot: input.mountRoot,
			template: input.template,
			tokens: input.tokens,
		});
		return;
	}

	input.mountRoot.replaceChildren(stagingElement);
	applyLastPageMarginOverrides({
		mountRoot: input.mountRoot,
		template: input.template,
		tokens: input.tokens,
	});
}

function buildStyleVars(template: TemplateResolved): CSSProperties {
	return {
		"--art-font-body": template.default.typography.fontFamily.body,
		"--art-font-heading": template.default.typography.fontFamily.heading,
		"--art-font-mono": template.default.typography.fontFamily.mono,
		"--art-font-size-body": template.default.typography.fontSize.body,
		"--art-font-size-h1": template.default.typography.fontSize.h1,
		"--art-font-size-h2": template.default.typography.fontSize.h2,
		"--art-font-size-h3": template.default.typography.fontSize.h3,
		"--art-line-height": String(template.default.typography.lineHeight),
		"--art-text-color": template.default.colors.text,
		"--art-muted-color": template.default.colors.muted,
		"--art-border-color": template.default.colors.border,
		"--art-link-color": template.default.colors.link,
	} as CSSProperties;
}

export function ArtichaleView(props: ArtichaleViewProps) {
	const sourceRef = useRef<HTMLDivElement | null>(null);
	const pagedMountRef = useRef<HTMLDivElement | null>(null);
	const [pagedError, setPagedError] = useState<string | null>(null);
	const [isPagedReady, setIsPagedReady] = useState(false);
	const pagedCss = useMemo(
		() =>
			buildArtichalePagedStylesheet({
				template: props.template,
				tokens: props.pagedTokens,
			}),
		[props.template, props.pagedTokens],
	);

	useEffect(() => {
		if (!props.enablePaged) {
			setIsPagedReady(false);
			return;
		}
		const sourceElement = sourceRef.current;
		const mountElement = pagedMountRef.current;
		if (!sourceElement || !mountElement) return;

		let cancelled = false;
		setPagedError(null);
		setIsPagedReady(false);

		const cssBlobUrl = URL.createObjectURL(
			new Blob([pagedCss], { type: "text/css" }),
		);

		void runArtichalePagedLayout({
			sourceRoot: sourceElement,
			mountRoot: mountElement,
			stylesheets: [cssBlobUrl, ...(props.pagedStylesheets ?? [])],
			template: props.template,
			tokens: props.pagedTokens,
		})
			.catch((error) => {
				if (cancelled) return;
				const detail = error instanceof Error ? error.message : String(error);
				setPagedError(detail);
			})
			.finally(() => {
				URL.revokeObjectURL(cssBlobUrl);
				if (cancelled) return;
				setIsPagedReady(true);
			});

		return () => {
			cancelled = true;
		};
	}, [
		props.enablePaged,
		props.pagedStylesheets,
		props.pagedTokens,
		props.template,
		pagedCss,
	]);

	return (
		<div
			id="artichale"
			className="artichale"
			// Print-only composition container.
			data-art-print-document="true"
			style={buildStyleVars(props.template)}
		>
			<div
				ref={sourceRef}
				className={
					props.enablePaged && isPagedReady
						? "pointer-events-none absolute top-0 -left-[200vw] opacity-0"
						: ""
				}
			>
				{props.title}
				{props.authors}
				{props.article}
				{props.references}
			</div>
			{props.enablePaged ? (
				<div className="paged-print-content" ref={pagedMountRef} />
			) : null}
			{props.enablePaged && !isPagedReady && !pagedError ? (
				<div className="p-2 text-slate-600 text-xs">Preparing pages...</div>
			) : null}
			{pagedError ? (
				<div className="p-2 text-red-600 text-xs">
					Paged.js failed: {pagedError}
				</div>
			) : null}
		</div>
	);
}
