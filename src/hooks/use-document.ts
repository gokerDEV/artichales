import type { Root } from "mdast";
import type { JSX } from "react";
import * as React from "react";
import type { PreviewTarget } from "@/components/artichales/panels/preview-header";
import type { PluginConfig } from "@/components/artichales/plugins/plugin.contract";
import type { ArticleFrontmatter } from "@/components/artichales/types/frontmatter.types";
import type {
	ParsedArticle,
	ParsedBibliography,
	ParsedTemplate,
	PipelineDiagnostic,
} from "@/components/artichales/types/pipeline.types";
import type { PluginRegistryMaps } from "@/components/artichales/types/plugin.types";
import type { BibtexDiagnostic, CitationEntry } from "@/lib/bibtex";
import { buildPluginRegistryMaps as createPluginRegistryMaps } from "@/lib/document-pipeline";
import {
	buildRenderReferenceLookup,
	type ReferenceSelectorTarget,
	type RenderedReferenceEntry,
	type ResolvedCaption,
	type ResolvedReference,
	renderDocument,
} from "@/lib/render-document";
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

export interface DocumentSource {
	ast: Root | null;
	frontmatter: ArticleFrontmatter;
	citationEntries: Record<string, CitationEntry>;
	renderedReferences: readonly RenderedReferenceEntry[];
	template: DocumentTemplate;
	parsedTemplate: ParsedTemplate;
	parsedBibliography: ParsedBibliography;
	parsedArticle: ParsedArticle;
	citationStyle: string;
	assetFiles: Array<{
		name: string;
		kind: string;
		lastUpdated: number;
	}>;
	templateDiagnostics: TemplateDiagnostic[];
	bibDiagnostics: BibtexDiagnostic[];
	assetDiagnostics: PipelineDiagnostic[];
	articleDiagnostics: PipelineDiagnostic[];
	resolvedReferences: Record<string, ResolvedReference>;
	captions: Record<string, ResolvedCaption>;
	referenceTargets: ReferenceSelectorTarget[];
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

export function resolveTemplateForTarget(
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

const EMPTY_FRONTMATTER: ArticleFrontmatter = { title: "Untitled" };
const EMPTY_PARSED_ARTICLE: ParsedArticle = {
	frontmatter: EMPTY_FRONTMATTER,
	ast: null,
	headings: [],
	labeledBlocks: [],
	citations: [],
	diagnostics: [],
};
const EMPTY_PARSED_BIBLIOGRAPHY: ParsedBibliography = {
	entriesById: {},
	diagnostics: [],
};
const EMPTY_PARSED_TEMPLATE: ParsedTemplate = {
	template: DEFAULT_TEMPLATE_FILE,
	enabledPluginIds: DEFAULT_TEMPLATE_FILE.plugins,
	diagnostics: [],
};

export function useDocument(
	_files: Record<string, string>,
	target: PreviewTarget,
): DocumentSource {
	const parsedTemplate = useWorkspaceStore((state) => state.parsedTemplate);
	const parsedBibliography = useWorkspaceStore(
		(state) => state.parsedBibliography,
	);
	const parsedArticle = useWorkspaceStore((state) => state.parsedArticle);
	const diagnostics = useWorkspaceStore((state) => state.diagnostics);
	const activePluginIds = useWorkspaceStore((state) => state.activePluginIds);
	const assetFiles = useWorkspaceStore((state) => state.assetFiles);

	const effectiveParsedTemplate = parsedTemplate ?? EMPTY_PARSED_TEMPLATE;
	const effectiveParsedBibliography =
		parsedBibliography ?? EMPTY_PARSED_BIBLIOGRAPHY;
	const effectiveParsedArticle = parsedArticle ?? EMPTY_PARSED_ARTICLE;
	const templateFile = effectiveParsedTemplate.template;
	const articleAst = effectiveParsedArticle.ast;
	const articleFrontmatter = effectiveParsedArticle.frontmatter;

	const resolvedTemplateForTarget = React.useMemo(
		() => resolveTemplateForTarget(templateFile, target),
		[target, templateFile],
	);

	const pluginRegistry = React.useMemo(
		(): PluginRegistryMaps =>
			createPluginRegistryMaps(effectiveParsedTemplate.enabledPluginIds),
		[effectiveParsedTemplate.enabledPluginIds],
	);

	const renderLookup = React.useMemo(
		() =>
			buildRenderReferenceLookup(
				effectiveParsedTemplate,
				effectiveParsedArticle,
				pluginRegistry,
			),
		[effectiveParsedArticle, effectiveParsedTemplate, pluginRegistry],
	);

	const renderedDocument = React.useMemo(
		() =>
			renderDocument({
				template: effectiveParsedTemplate,
				bibliography: effectiveParsedBibliography,
				article: effectiveParsedArticle,
				pluginRegistry,
				target,
			}),
		[
			effectiveParsedArticle,
			effectiveParsedBibliography,
			effectiveParsedTemplate,
			pluginRegistry,
			target,
		],
	);

	const citationEntries = React.useMemo(() => {
		const map: Record<string, CitationEntry> = {};
		for (const item of renderedDocument.references) {
			map[item.id] = item.entry;
		}
		return map;
	}, [renderedDocument.references]);

	const citationStyle = React.useMemo(
		() => resolvedTemplateForTarget?.citationStyle ?? "numeric",
		[resolvedTemplateForTarget?.citationStyle],
	);

	const templateDiagnostics = React.useMemo(
		(): TemplateDiagnostic[] => [...effectiveParsedTemplate.diagnostics],
		[effectiveParsedTemplate.diagnostics],
	);
	const bibDiagnostics = React.useMemo(
		(): BibtexDiagnostic[] => [...effectiveParsedBibliography.diagnostics],
		[effectiveParsedBibliography.diagnostics],
	);
	const assetDiagnostics = React.useMemo((): PipelineDiagnostic[] => [], []);
	const articleDiagnostics = React.useMemo(
		(): PipelineDiagnostic[] => [...effectiveParsedArticle.diagnostics],
		[effectiveParsedArticle.diagnostics],
	);
	const pipelineDiagnostics = React.useMemo(
		(): PipelineDiagnostic[] =>
			diagnostics.filter(
				(d): d is PipelineDiagnostic =>
					"source" in d && d.source === "pipeline",
			),
		[diagnostics],
	);
	const blockingByFile = React.useMemo(() => {
		const result: Partial<Record<string, string>> = {};
		if (templateDiagnostics.some((diag) => diag.severity === "error")) {
			result[CORE_TEMPLATE_FILE] =
				"Fix template errors before switching away from `template.json`.";
		}
		if (bibDiagnostics.some((diag) => diag.severity === "error")) {
			result[CORE_BIB_FILE] =
				"Fix BibTeX errors before switching away from `references.bib`.";
		}
		if (articleDiagnostics.some((diag) => diag.severity === "error")) {
			result[CORE_ARTICLE_FILE] =
				"Fix article parsing errors before switching away from `article.mda`.";
		}
		return result;
	}, [articleDiagnostics, bibDiagnostics, templateDiagnostics]);

	return {
		ast: articleAst,
		frontmatter: articleFrontmatter,
		citationEntries,
		renderedReferences: renderedDocument.references,
		template: resolvedTemplateForTarget,
		parsedTemplate: effectiveParsedTemplate,
		parsedBibliography: effectiveParsedBibliography,
		parsedArticle: effectiveParsedArticle,
		citationStyle,
		assetFiles,
		templateDiagnostics,
		bibDiagnostics,
		assetDiagnostics,
		articleDiagnostics,
		resolvedReferences: renderLookup.resolvedReferences,
		captions: renderLookup.captions,
		referenceTargets: renderLookup.referenceTargets,
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
