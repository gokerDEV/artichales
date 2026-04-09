import { parse as parseYaml } from "yaml";
import type {
	FlowBreak,
	Page,
	PageRegion,
	PaginatedPageTree,
	PrintFlowNode,
	PrintLayoutHint,
} from "@/types/artichales";

type PrintTemplateConfig = {
	page?: {
		size?: string;
		orientation?: "portrait" | "landscape";
		margin?: {
			top?: string;
			right?: string;
			bottom?: string;
			left?: string;
		};
	};
	layout?: {
		firstPageColumns?: number;
		defaultPageColumns?: number;
	};
	headerFooter?: {
		enabled?: boolean;
		firstPage?: {
			header?: {
				left?: string;
				center?: string;
				right?: string;
			};
			footer?: {
				left?: string;
				center?: string;
				right?: string;
			};
		};
		defaultPage?: {
			header?: {
				left?: string;
				center?: string;
				right?: string;
			};
			footer?: {
				left?: string;
				center?: string;
				right?: string;
			};
		};
	};
};

type PaginationInput = {
	content: string;
	template: PrintTemplateConfig;
	title: string;
	includeTitleNode?: boolean;
	includeReferencesNode?: boolean;
};

type PageBoxMetrics = {
	width: string;
	height: string;
	pageHeightPx: number;
	headerHeightPx: number;
	footerHeightPx: number;
	bodyHeightPx: number;
	firstPageColumns: number;
	defaultPageColumns: number;
};

type HeaderFooterText = {
	header: { left: string; center: string; right: string };
	footer: { left: string; center: string; right: string };
};

export const PAGE_LIMIT = 40;

function parseMetricMm(value: string | undefined, fallbackMm: number): number {
	if (!value) return fallbackMm;
	const normalized = value.trim().toLowerCase();
	if (normalized.endsWith("mm")) {
		const parsed = Number.parseFloat(normalized.replace("mm", ""));
		return Number.isFinite(parsed) ? parsed : fallbackMm;
	}
	const parsed = Number.parseFloat(normalized);
	return Number.isFinite(parsed) ? parsed : fallbackMm;
}

function resolvePageBox(template: PrintTemplateConfig): PageBoxMetrics {
	const page = template.page;
	const orientation =
		page?.orientation === "landscape" ? "landscape" : "portrait";
	const isA4 = page?.size === "A4" || !page?.size;
	const widthMm = isA4 ? (orientation === "portrait" ? 210 : 297) : 210;
	const heightMm = isA4 ? (orientation === "portrait" ? 297 : 210) : 297;
	const width = `${widthMm}mm`;
	const height = `${heightMm}mm`;
	const pageHeightPx = orientation === "portrait" ? 1123 : 794;
	const pxPerMm = pageHeightPx / heightMm;

	const margin = page?.margin;
	const marginTopPx = parseMetricMm(margin?.top, 24) * pxPerMm;
	const marginBottomPx = parseMetricMm(margin?.bottom, 24) * pxPerMm;

	const headerEnabled = template.headerFooter?.enabled !== false;
	const headerHeightPx = headerEnabled ? 38 : 0;
	const footerHeightPx = headerEnabled ? 38 : 0;
	const bodyHeightPx =
		pageHeightPx -
		marginTopPx -
		marginBottomPx -
		headerHeightPx -
		footerHeightPx;

	return {
		width,
		height,
		pageHeightPx,
		headerHeightPx,
		footerHeightPx,
		bodyHeightPx: Math.max(220, Math.floor(bodyHeightPx)),
		firstPageColumns: Math.max(1, template.layout?.firstPageColumns || 1),
		defaultPageColumns: Math.max(1, template.layout?.defaultPageColumns || 1),
	};
}

function parseLayoutHintFromDirectiveBlock(markdown: string): PrintLayoutHint {
	const defaultHint: PrintLayoutHint = {
		span: "column",
		breakBefore: "auto",
		breakAfter: "auto",
	};
	const lines = markdown.split("\n");
	const firstLine = lines[0]?.trim() || "";
	const isFlowDirective =
		firstLine.startsWith(":::plotty[") || firstLine.startsWith(":::datatable[");
	if (!isFlowDirective) return defaultHint;

	const bodyLines = lines.slice(1, -1);
	const bodyText = bodyLines.join("\n").trim();
	if (!bodyText) return defaultHint;

	let parsed: unknown = null;
	try {
		parsed = parseYaml(bodyText);
	} catch {
		return defaultHint;
	}
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		return defaultHint;
	}

	const raw = parsed as Record<string, unknown>;
	const span = raw.span === "page" ? "page" : "column";
	const breakBefore: FlowBreak = raw.breakBefore === "page" ? "page" : "auto";
	const breakAfter: FlowBreak = raw.breakAfter === "page" ? "page" : "auto";

	return {
		span,
		breakBefore,
		breakAfter,
	};
}

function estimateNodeHeightPx(markdown: string, hint: PrintLayoutHint): number {
	const lines = markdown.split("\n").length;
	const chars = markdown.length;
	const lineCost = lines * 20;
	const charCost = Math.ceil(chars / 120) * 6;
	const spanBonus = hint.span === "page" ? 150 : 0;
	return Math.max(36, lineCost + charCost + spanBonus);
}

function splitMarkdownIntoFlowNodes(content: string): PrintFlowNode[] {
	const lines = content.split("\n");
	const nodes: PrintFlowNode[] = [];
	let cursor = 0;

	while (cursor < lines.length) {
		while (cursor < lines.length && lines[cursor].trim() === "") cursor++;
		if (cursor >= lines.length) break;

		const line = lines[cursor];
		if (line.trim().startsWith(":::")) {
			const blockLines = [line];
			cursor++;
			while (cursor < lines.length) {
				blockLines.push(lines[cursor]);
				if (lines[cursor].trim() === ":::") {
					cursor++;
					break;
				}
				cursor++;
			}
			const markdown = blockLines.join("\n");
			const layoutHint = parseLayoutHintFromDirectiveBlock(markdown);
			nodes.push({
				id: `md-${nodes.length + 1}`,
				kind: "markdown",
				markdown,
				layoutHint,
				estimatedHeightPx: estimateNodeHeightPx(markdown, layoutHint),
			});
			continue;
		}

		const blockLines = [line];
		cursor++;
		while (cursor < lines.length && lines[cursor].trim() !== "") {
			blockLines.push(lines[cursor]);
			cursor++;
		}
		const markdown = blockLines.join("\n");
		const layoutHint: PrintLayoutHint = {
			span: "column",
			breakBefore: "auto",
			breakAfter: "auto",
		};
		nodes.push({
			id: `md-${nodes.length + 1}`,
			kind: "markdown",
			markdown,
			layoutHint,
			estimatedHeightPx: estimateNodeHeightPx(markdown, layoutHint),
		});
	}

	return nodes;
}

function resolveHeaderFooterText(
	template: PrintTemplateConfig,
	title: string,
	pageNumber: number,
	isFirstPage: boolean,
): HeaderFooterText {
	const hf = template.headerFooter;
	const pageTokens = isFirstPage ? hf?.firstPage : hf?.defaultPage;
	const header = pageTokens?.header || {};
	const footer = pageTokens?.footer || {};
	const tokenMap: Record<string, string> = {
		title,
		pageNumber: String(pageNumber),
	};
	const applyTokens = (text: string | undefined): string => {
		if (!text) return "";
		return text.replace(/\{(\w+)\}/g, (_, key: string) => tokenMap[key] || "");
	};
	return {
		header: {
			left: applyTokens(header.left),
			center: applyTokens(header.center),
			right: applyTokens(header.right),
		},
		footer: {
			left: applyTokens(footer.left),
			center: applyTokens(footer.center),
			right: applyTokens(footer.right),
		},
	};
}

/**
 * Flow decision:
 * We paginate using lightweight block-height estimates instead of runtime DOM measurement
 * so both preview and export can use one deterministic page tree in pure data space.
 */
export function buildPaginatedPageTree({
	content,
	template,
	title,
	includeTitleNode = true,
	includeReferencesNode = true,
}: PaginationInput): PaginatedPageTree {
	const pageBox = resolvePageBox(template);
	const markdownNodes = splitMarkdownIntoFlowNodes(content);
	const flowNodes: PrintFlowNode[] = [];

	if (includeTitleNode) {
		flowNodes.push({
			id: "title-node",
			kind: "title",
			layoutHint: { span: "page", breakBefore: "auto", breakAfter: "auto" },
			estimatedHeightPx: 120,
		});
	}
	flowNodes.push(...markdownNodes);
	if (includeReferencesNode) {
		flowNodes.push({
			id: "references-node",
			kind: "references",
			layoutHint: { span: "page", breakBefore: "auto", breakAfter: "auto" },
			estimatedHeightPx: 180,
		});
	}

	const pages: Page[] = [];
	let currentNodes: PrintFlowNode[] = [];
	let usedHeight = 0;
	let wasTruncated = false;

	const pushPage = () => {
		if (currentNodes.length === 0) return;
		if (pages.length >= PAGE_LIMIT) {
			wasTruncated = true;
			currentNodes = [];
			usedHeight = 0;
			return;
		}
		const pageNumber = pages.length + 1;
		const isFirstPage = pageNumber === 1;
		const text = resolveHeaderFooterText(
			template,
			title,
			pageNumber,
			isFirstPage,
		);
		const regions: PageRegion[] = [
			{
				type: "header",
				left: text.header.left,
				center: text.header.center,
				right: text.header.right,
			},
			{
				type: "body",
				columns: isFirstPage
					? pageBox.firstPageColumns
					: pageBox.defaultPageColumns,
				nodes: currentNodes,
			},
			{
				type: "footer",
				left: text.footer.left,
				center: text.footer.center,
				right: text.footer.right,
				pageNumber,
			},
		];
		pages.push({ number: pageNumber, regions });
		currentNodes = [];
		usedHeight = 0;
	};

	for (const node of flowNodes) {
		if (wasTruncated) break;
		const shouldBreakBefore = node.layoutHint.breakBefore === "page";
		if (shouldBreakBefore && currentNodes.length > 0) {
			pushPage();
		}

		const wouldOverflow =
			usedHeight + node.estimatedHeightPx > pageBox.bodyHeightPx;
		if (wouldOverflow && currentNodes.length > 0) {
			pushPage();
		}

		currentNodes.push(node);
		usedHeight += node.estimatedHeightPx;

		const shouldBreakAfter = node.layoutHint.breakAfter === "page";
		if (shouldBreakAfter) {
			pushPage();
		}
	}
	pushPage();

	return {
		target: "print",
		pageLimit: PAGE_LIMIT,
		wasTruncated,
		pageBox: {
			width: pageBox.width,
			height: pageBox.height,
			headerHeightPx: pageBox.headerHeightPx,
			footerHeightPx: pageBox.footerHeightPx,
			bodyHeightPx: pageBox.bodyHeightPx,
			columns: pageBox.defaultPageColumns,
		},
		pages,
	};
}
