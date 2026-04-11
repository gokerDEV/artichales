import type { JSX } from "react";
import * as React from "react";
import type { PreviewTarget } from "@/components/artichales/panels/preview-header";
import type { PluginConfig } from "@/components/artichales/plugins/plugin.contract";
import type {
	ArticleAnalysisDiagnostic,
	ResolvedCaption,
	ResolvedReference,
} from "@/lib/article-analysis";
import type {
	BibtexDiagnostic,
	CitationEntry,
	ValidatedBibEntry,
} from "@/lib/bibtex";
import type {
	AppDiagnostic,
	PipelineDiagnostic,
} from "@/lib/document-pipeline";
import type {
	ResolvedMarginConfig,
	TemplateDiagnostic,
	TemplateFileResolved,
} from "@/lib/template";
import { DEFAULT_TEMPLATE_FILE } from "@/lib/template";
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
	publisher: {
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
	pageMargins: {
		header: ResolvedMarginConfig;
		footer: ResolvedMarginConfig;
		left: ResolvedMarginConfig;
		right: ResolvedMarginConfig;
	};
	layout?: {
		firstPageColumns?: number;
		defaultPageColumns?: number;
		columnGap?: string;
	};
	pluginConfigs?: Record<string, PluginConfig>;
	webLayout?: {
		containerWidth?: string;
		containerClass?: string;
		containerPaddingClass?: string;
		contentClass?: string;
	};
	utilities?: Record<string, string>;
	referenceLabels?: Record<string, string>;
	colors?: {
		text?: string;
		muted?: string;
		border?: string;
		link?: string;
	};
	citationStyle?: string;
	assetMaxFileSize?: number;
	plugins?: string[];
};

import type { Root } from "mdast";

export interface DocumentSource {
	ast: Root | null;
	content: string;
	frontmatter: Record<string, unknown>;
	citations: Record<string, CitationEntry>;
	validatedBibEntries: Record<string, ValidatedBibEntry>;
	plots: Record<string, unknown>;
	template: DocumentTemplate;
	citationStyle: string;
	assetFiles: Array<{
		name: string;
		kind: string;
		lastUpdated: number;
	}>;
	templateDiagnostics: TemplateDiagnostic[];
	bibDiagnostics: BibtexDiagnostic[];
	assetDiagnostics: PipelineDiagnostic[];
	articleDiagnostics: Array<PipelineDiagnostic | ArticleAnalysisDiagnostic>;
	resolvedReferences: Record<string, ResolvedReference>;
	captions: Record<string, ResolvedCaption>;
	referenceTargets: Array<{
		selector: string;
		mode: "full" | "partial";
	}>;
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
		publisher: templateFile.publisher,
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
		pageMargins: print.pageMargins,
		layout: {
			firstPageColumns: print.layout.firstPageColumns,
			defaultPageColumns: print.layout.defaultPageColumns,
			columnGap: print.layout.columnGap,
		},
		pluginConfigs: defaults.components,
		webLayout: web.layout,
		utilities: defaults.utilities,
		referenceLabels: defaults.referenceLabels,
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

import { useWorkspaceStore } from "@/store/workspace.store";

export function useDocument(
	_files: Record<string, string>,
	target: PreviewTarget,
): DocumentSource {
	const ast = useWorkspaceStore((state) => state.ast);
	const content = useWorkspaceStore((state) => state.content);
	const frontmatter = useWorkspaceStore((state) => state.frontmatter);
	const citations = useWorkspaceStore((state) => state.citations);
	const validatedBibEntries = useWorkspaceStore(
		(state) => state.validatedBibEntries,
	);
	const plots = useWorkspaceStore((state) => state.plots);
	const templateFile = useWorkspaceStore((state) => state.template);
	const referenceRegistry = useWorkspaceStore(
		(state) => state.referenceRegistry,
	);
	const captions = useWorkspaceStore((state) => state.captions);
	const referenceTargets = useWorkspaceStore((state) => state.referenceTargets);
	const diagnostics = useWorkspaceStore((state) => state.diagnostics);
	const activePluginIds = useWorkspaceStore((state) => state.activePluginIds);
	const assetFiles = useWorkspaceStore((state) => state.assetFiles);

	const resolvedTemplateForTarget = React.useMemo(
		() =>
			resolveTemplateForTarget(templateFile ?? DEFAULT_TEMPLATE_FILE, target),
		[target, templateFile],
	);

	const citationStyle = React.useMemo(
		() => resolvedTemplateForTarget?.citationStyle ?? "numeric",
		[resolvedTemplateForTarget?.citationStyle],
	);

	const blockingByFile = React.useMemo(() => {
		const result: Partial<Record<string, string>> = {};

		const isError = (diag: AppDiagnostic) => diag.severity === "error";

		if (
			diagnostics.some(
				(diag) => isError(diag) && diag.code.startsWith("template-"),
			)
		) {
			result[CORE_TEMPLATE_FILE] =
				"Fix template errors before switching away from `template.json`.";
		}
		if (
			diagnostics.some(
				(diag) => isError(diag) && diag.code.startsWith("bibtex-"),
			)
		) {
			result[CORE_BIB_FILE] =
				"Fix BibTeX errors before switching away from `references.bib`.";
		}
		if (
			diagnostics.some(
				(diag): diag is PipelineDiagnostic =>
					"source" in diag &&
					isError(diag) &&
					(diag.source === "parser" ||
						diag.source === "plugin" ||
						diag.source === "core"),
			)
		) {
			result[CORE_ARTICLE_FILE] =
				"Fix article parsing errors before switching away from `article.mda`.";
		}
		for (const diagnostic of diagnostics) {
			if (
				diagnostic.code !== "asset-json-invalid" ||
				!("fileName" in diagnostic)
			)
				continue;
			const pipelineDiag = diagnostic as PipelineDiagnostic;
			if (!pipelineDiag.fileName) continue;
			result[pipelineDiag.fileName] =
				"Fix JSON asset syntax errors before switching away from this file.";
		}
		return result;
	}, [diagnostics]);

	const templateDiagnostics = React.useMemo(
		(): TemplateDiagnostic[] =>
			diagnostics.filter((d): d is TemplateDiagnostic =>
				d.code.startsWith("template-"),
			),
		[diagnostics],
	);
	const bibDiagnostics = React.useMemo(
		(): BibtexDiagnostic[] =>
			diagnostics.filter((d): d is BibtexDiagnostic =>
				d.code.startsWith("bibtex-"),
			),
		[diagnostics],
	);
	const assetDiagnostics = React.useMemo(
		(): PipelineDiagnostic[] =>
			diagnostics.filter(
				(d): d is PipelineDiagnostic => d.code === "asset-json-invalid",
			),
		[diagnostics],
	);
	const articleDiagnostics = React.useMemo(
		(): PipelineDiagnostic[] =>
			diagnostics.filter(
				(d): d is PipelineDiagnostic =>
					"source" in d &&
					(d.source === "parser" ||
						d.source === "plugin" ||
						d.source === "core"),
			),
		[diagnostics],
	);
	const pipelineDiagnostics = React.useMemo(
		(): PipelineDiagnostic[] =>
			diagnostics.filter(
				(d): d is PipelineDiagnostic =>
					"source" in d && d.source === "pipeline",
			),
		[diagnostics],
	);

	return {
		ast,
		content: content || "",
		frontmatter,
		citations,
		validatedBibEntries,
		plots,
		template: resolvedTemplateForTarget,
		citationStyle,
		assetFiles,
		templateDiagnostics,
		bibDiagnostics,
		assetDiagnostics,
		articleDiagnostics,
		resolvedReferences: referenceRegistry,
		captions,
		referenceTargets,
		activePluginIds,
		pipelineDiagnostics,
		blockingByFile,
		isBlockingActiveFile: (fileName) => Boolean(blockingByFile[fileName]),
		hasTemplateError: templateDiagnostics.some(
			(diag) => diag.severity === "error",
		),
		hasBlockingError:
			templateDiagnostics.some((diag) => diag.severity === "error") ||
			bibDiagnostics.some((diag) => diag.severity === "error") ||
			assetDiagnostics.some((diag) => diag.severity === "error") ||
			articleDiagnostics.some((diag) => diag.severity === "error"),
	};
}
