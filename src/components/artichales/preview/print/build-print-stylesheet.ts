import type { DocumentSource } from "@/hooks/use-document";
import type { ResolvedMarginConfig } from "@/lib/template";

function formatMarginContent(
	document: DocumentSource,
	value: string | undefined,
): string {
	if (!value) return "none";
	const tokens = value.split(/(\{.*?\})/g).filter(Boolean);
	const cssTokens = tokens.map((token) => {
		if (token === "{pageNumber}") return "counter(page)";
		if (token === "{totalPages}") return "counter(pages)";
		if (token.startsWith("{") && token.endsWith("}")) {
			const path = token.slice(1, -1).trim().split(".");
			let current: unknown = document.frontmatter;
			for (const key of path) {
				if (current == null || typeof current !== "object") break;
				current = (current as Record<string, unknown>)[key];
			}
			return `"${String(current ?? "").replaceAll('"', '\\"')}"`;
		}
		return `"${token.replaceAll('"', '\\"')}"`;
	});
	return cssTokens.join(" ");
}

function createZoneCss(
	document: DocumentSource,
	pageSelector: string,
	state: "first" | "odd" | "even",
	config: ResolvedMarginConfig | undefined,
	baseStr: "top" | "bottom",
): string {
	if (!config?.enabled) return "";
	const segs = config[state];
	if (!segs) return "";
	return `
@page ${pageSelector} {
	@${baseStr}-left { content: ${formatMarginContent(document, segs.left)}; text-align: left; font-size: 9pt; color: #4b5563; }
	@${baseStr}-center { content: ${formatMarginContent(document, segs.center)}; text-align: center; font-size: 9pt; color: #4b5563; }
	@${baseStr}-right { content: ${formatMarginContent(document, segs.right)}; text-align: right; font-size: 9pt; color: #4b5563; }
}`;
}

export function buildPrintStylesheet(document: DocumentSource): string {
	const pageConfig = document.template?.page;
	const margins = pageConfig?.margin;
	const layout = document.template?.layout;
	const pageMargins = document.template?.pageMargins;
	const orientation =
		pageConfig?.orientation === "landscape" ? "landscape" : "portrait";
	const pageSize = pageConfig?.size || "A4";
	const marginTop = typeof margins?.top === "string" ? margins.top : "24mm";
	const marginRight =
		typeof margins?.right === "string" ? margins.right : "20mm";
	const marginBottom =
		typeof margins?.bottom === "string" ? margins.bottom : "24mm";
	const marginLeft = typeof margins?.left === "string" ? margins.left : "20mm";
	const defaultColumns = Math.max(1, layout?.defaultPageColumns || 2);
	const firstPageColumns = Math.max(1, layout?.firstPageColumns || 1);
	const columnGap = layout?.columnGap || "7mm";

	const marginBoxes = `
${createZoneCss(document, ":first", "first", pageMargins?.header, "top")}
${createZoneCss(document, ":first", "first", pageMargins?.footer, "bottom")}
${createZoneCss(document, ":right", "odd", pageMargins?.header, "top")}
${createZoneCss(document, ":right", "odd", pageMargins?.footer, "bottom")}
${createZoneCss(document, ":left", "even", pageMargins?.header, "top")}
${createZoneCss(document, ":left", "even", pageMargins?.footer, "bottom")}
`;

	const verticalMarginBoxes = `
@page :first {
	@left-middle { content: ${formatMarginContent(document, pageMargins?.left?.first?.center)}; writing-mode: vertical-rl; transform: rotate(180deg); font-size: 9pt; color: #4b5563; }
	@right-middle { content: ${formatMarginContent(document, pageMargins?.right?.first?.center)}; writing-mode: vertical-rl; font-size: 9pt; color: #4b5563; }
}
@page :right {
	@left-middle { content: ${formatMarginContent(document, pageMargins?.left?.odd?.center)}; writing-mode: vertical-rl; transform: rotate(180deg); font-size: 9pt; color: #4b5563; }
	@right-middle { content: ${formatMarginContent(document, pageMargins?.right?.odd?.center)}; writing-mode: vertical-rl; font-size: 9pt; color: #4b5563; }
}
@page :left {
	@left-middle { content: ${formatMarginContent(document, pageMargins?.left?.even?.center)}; writing-mode: vertical-rl; transform: rotate(180deg); font-size: 9pt; color: #4b5563; }
	@right-middle { content: ${formatMarginContent(document, pageMargins?.right?.even?.center)}; writing-mode: vertical-rl; font-size: 9pt; color: #4b5563; }
}
`;

	return `@page { size: ${pageSize} ${orientation}; margin: ${marginTop} ${marginRight} ${marginBottom} ${marginLeft}; }
.paged-print-content .artichales__body,
.paged-print-content .pagedjs_page_content {
	column-count: ${defaultColumns};
	column-gap: ${columnGap};
}
.paged-print-content .pagedjs_first_page .artichales__body,
.paged-print-content .pagedjs_first_page .pagedjs_page_content {
	column-count: ${firstPageColumns};
}
${marginBoxes}
${verticalMarginBoxes}`;
}
