import type { JSX } from "react";
import * as React from "react";
import type { PreviewTarget } from "@/components/artichales/panels/preview-header";
import type {
	ArticleAnalysisDiagnostic,
	ResolvedReference,
} from "@/lib/article-analysis";
import type {
	BibtexDiagnostic,
	CitationEntry,
	ValidatedBibEntry,
} from "@/lib/bibtex";
import {
	type PipelineDiagnostic,
	runDocumentPipeline,
} from "@/lib/document-pipeline";
import type { TemplateDiagnostic, TemplateFileResolved } from "@/lib/template";
import {
	CORE_ARTICLE_FILE,
	CORE_BIB_FILE,
	CORE_TEMPLATE_FILE,
} from "@/lib/workspace";

type RenderTarget = "web" | "print";

type DocumentStyle = {
	columns?: number;
	fontFamily?: {
		body?: string;
		heading?: string;
		mono?: string;
	};
	fontSize?: {
		body?: string;
		h1?: string;
		h2?: string;
		h3?: string;
	};
	lineHeight?: number;
	textAlign?: "left" | "right" | "center" | "justify";
};

export type DocumentTemplate = {
	version: number;
	journal: {
		id: string;
		name: string;
	};
	target: RenderTarget;
	container?: keyof JSX.IntrinsicElements;
	page?: {
		size?: "A4" | string;
		orientation?: "portrait" | "landscape";
		margin?: {
			top?: string;
			right?: string;
			bottom?: string;
			left?: string;
		};
	};
	document?: DocumentStyle;
	titleBlock?: {
		enabled?: boolean;
		showAuthors?: boolean;
		showAffiliations?: boolean;
		showKeywords?: boolean;
		align?: "left" | "right" | "center";
		spacingAfter?: string;
	};
	headerFooter?: {
		enabled?: boolean;
		firstPage?: {
			header?: { left?: string; center?: string; right?: string };
			footer?: { left?: string; center?: string; right?: string };
		};
		defaultPage?: {
			header?: { left?: string; center?: string; right?: string };
			footer?: { left?: string; center?: string; right?: string };
		};
	};
	layout?: {
		firstPageColumns?: number;
		defaultPageColumns?: number;
		columnGap?: string;
	};
	componentDefaults?: {
		figure?: {
			captionPosition?: "top" | "bottom";
			defaultSpan?: "column" | "full";
			spacingBefore?: string;
			spacingAfter?: string;
		};
		table?: {
			captionPosition?: "top" | "bottom";
			defaultSpan?: "column" | "full";
			spacingBefore?: string;
			spacingAfter?: string;
		};
	};
	webLayout?: {
		containerWidth?: string;
		containerClass?: string;
		containerPaddingClass?: string;
		contentClass?: string;
	};
	utilities?: Record<string, string>;
	colors?: {
		text?: string;
		muted?: string;
		border?: string;
		link?: string;
	};
	citationStyle?: string;
	assetMaxFileSize?: number;
	plugins?: Array<{
		id: string;
		enabled: boolean;
	}>;
};

export interface DocumentSource {
	content: string;
	frontmatter: Record<string, unknown>;
	citations: Record<string, CitationEntry>;
	validatedBibEntries: Record<string, ValidatedBibEntry>;
	plots: Record<string, unknown>;
	template: DocumentTemplate;
	citationStyle: string;
	templateDiagnostics: TemplateDiagnostic[];
	bibDiagnostics: BibtexDiagnostic[];
	assetDiagnostics: Array<{
		code: "asset-json-invalid";
		severity: "error";
		source: "parser";
		fileName: string;
		message: string;
	}>;
	articleDiagnostics: Array<
		| {
				code:
					| "article-frontmatter-missing"
					| "article-frontmatter-invalid"
					| "article-footnote-unsupported";
				severity: "error";
				message: string;
				source: "parser";
		  }
		| ArticleAnalysisDiagnostic
	>;
	resolvedReferences: Record<string, ResolvedReference>;
	activePluginIds: {
		parser: string[];
		core: string[];
		render: string[];
		editor: string[];
	};
	pipelineDiagnostics: PipelineDiagnostic[];
	blockingByFile: Partial<Record<string, string>>;
	isBlockingActiveFile: (fileName: string) => boolean;
	hasTemplateError: boolean;
	hasBlockingError: boolean;
}

function resolveTemplateForTarget(
	templateFile: TemplateFileResolved,
	target: PreviewTarget,
): DocumentTemplate {
	const defaults = templateFile.default;
	const print = templateFile.print;
	const web = templateFile.web;

	const baseTemplate: Omit<DocumentTemplate, "target"> = {
		version: templateFile.version,
		journal: templateFile.journal,
		container: "article",
		document: {
			columns: print.layout.defaultPageColumns,
			fontFamily: defaults.typography.fontFamily,
			fontSize: defaults.typography.fontSize,
			lineHeight: defaults.typography.lineHeight,
			textAlign: defaults.typography.textAlign,
		},
		page: {
			size: print.page.size,
			orientation: print.page.orientation,
			margin: print.page.margin,
		},
		titleBlock: print.titleBlock,
		headerFooter: print.headerFooter,
		layout: {
			firstPageColumns: print.layout.firstPageColumns,
			defaultPageColumns: print.layout.defaultPageColumns,
			columnGap: print.layout.columnGap,
		},
		componentDefaults: defaults.components,
		webLayout: web.layout,
		utilities: defaults.utilities,
		colors: defaults.colors,
		citationStyle: defaults.citationStyle,
		assetMaxFileSize: defaults.assets.maxFileSize,
		plugins: templateFile.plugins,
	};

	return {
		...baseTemplate,
		target,
	};
}

export function useDocument(
	files: Record<string, string>,
	target: PreviewTarget,
): DocumentSource {
	const pipeline = React.useMemo(
		() => runDocumentPipeline(files, target),
		[files, target],
	);

	const resolvedTemplateForTarget = React.useMemo(
		() => resolveTemplateForTarget(pipeline.template, target),
		[pipeline.template, target],
	);

	const citationStyle = React.useMemo(
		() => resolvedTemplateForTarget.citationStyle || "author-year",
		[resolvedTemplateForTarget.citationStyle],
	);

	const blockingByFile = React.useMemo(() => {
		const result: Partial<Record<string, string>> = {};
		if (
			pipeline.templateDiagnostics.some((diag) => diag.severity === "error")
		) {
			result[CORE_TEMPLATE_FILE] =
				"Fix template errors before switching away from `template.json`.";
		}
		if (pipeline.bibDiagnostics.some((diag) => diag.severity === "error")) {
			result[CORE_BIB_FILE] =
				"Fix BibTeX errors before switching away from `references.bib`.";
		}
		if (pipeline.articleDiagnostics.some((diag) => diag.severity === "error")) {
			result[CORE_ARTICLE_FILE] =
				"Fix article parsing errors before switching away from `article.mda`.";
		}
		for (const diagnostic of pipeline.assetDiagnostics) {
			if (!diagnostic.fileName) continue;
			result[diagnostic.fileName] =
				"Fix JSON asset syntax errors before switching away from this file.";
		}
		return result;
	}, [
		pipeline.articleDiagnostics,
		pipeline.assetDiagnostics,
		pipeline.bibDiagnostics,
		pipeline.templateDiagnostics,
	]);

	return {
		content: pipeline.content,
		frontmatter: pipeline.frontmatter,
		citations: pipeline.citations,
		validatedBibEntries: pipeline.validatedBibEntries,
		plots: pipeline.plots,
		template: resolvedTemplateForTarget,
		citationStyle,
		templateDiagnostics: pipeline.templateDiagnostics,
		bibDiagnostics: pipeline.bibDiagnostics,
		assetDiagnostics:
			pipeline.assetDiagnostics as DocumentSource["assetDiagnostics"],
		articleDiagnostics:
			pipeline.articleDiagnostics as DocumentSource["articleDiagnostics"],
		resolvedReferences: pipeline.resolvedReferences,
		activePluginIds: pipeline.activePluginIds,
		pipelineDiagnostics: pipeline.pipelineDiagnostics,
		blockingByFile,
		isBlockingActiveFile: (fileName) => Boolean(blockingByFile[fileName]),
		hasTemplateError: pipeline.templateDiagnostics.some(
			(diag) => diag.severity === "error",
		),
		hasBlockingError:
			pipeline.templateDiagnostics.some((diag) => diag.severity === "error") ||
			pipeline.bibDiagnostics.some((diag) => diag.severity === "error") ||
			pipeline.assetDiagnostics.some((diag) => diag.severity === "error") ||
			pipeline.articleDiagnostics.some((diag) => diag.severity === "error"),
	};
}
