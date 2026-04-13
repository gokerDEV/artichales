import type { Root } from "mdast";
import type {
	HeadingEntry,
	LabeledBlockEntry,
} from "@/components/artichales/types/article.types";
import type { ArticleFrontmatter } from "@/components/artichales/types/frontmatter.types";
import type { PluginRegistryMaps } from "@/components/artichales/types/plugin.types";
import type { BibtexDiagnostic, ValidatedBibEntry } from "@/lib/bibtex";
import type { TemplateDiagnostic, TemplateFileResolved } from "@/lib/template";

export type PipelineStage =
	| "validate-template"
	| "validate-bibliography"
	| "parse-article"
	| "build-registry-and-numbering";

export type PipelineDiagnostic = {
	code:
		| "pipeline-stage-complete"
		| "article-frontmatter-missing"
		| "article-frontmatter-invalid"
		| "article-frontmatter-schema-invalid"
		| "article-footnote-unsupported"
		| "article-heading-parent-missing"
		| "article-heading-duplicate-label"
		| "article-labeled-block-duplicate-label"
		| "plugin-runtime-missing"
		| "plugin-hook-failed";
	severity: "error" | "warning" | "info";
	source: "pipeline" | "parser" | "plugin";
	message: string;
	stage?: PipelineStage;
	fileName?: string;
	pluginId?: string;
	offset?: number;
	line?: number;
	column?: number;
};

export type AppDiagnostic =
	| TemplateDiagnostic
	| BibtexDiagnostic
	| PipelineDiagnostic;

export type ParsedTemplate = {
	template: TemplateFileResolved;
	enabledPluginIds: readonly string[];
	diagnostics: readonly TemplateDiagnostic[];
};

export type ParsedBibliography = {
	entriesById: Readonly<Record<string, ValidatedBibEntry>>;
	diagnostics: readonly BibtexDiagnostic[];
};

export type ParsedArticle = {
	frontmatter: ArticleFrontmatter;
	ast: Root | null;
	headings: readonly HeadingEntry[];
	labeledBlocks: readonly LabeledBlockEntry[];
	citations: readonly string[];
	diagnostics: readonly PipelineDiagnostic[];
};

export type PipelineExecutionResult = {
	template: ParsedTemplate;
	bibliography: ParsedBibliography;
	article: ParsedArticle;
	pluginRegistry: PluginRegistryMaps;
	activePluginIds: {
		parser: string[];
		core: string[];
		render: string[];
		editor: string[];
	};
	diagnostics: AppDiagnostic[];
};

export type PipelineResultPayload = {
	parsedTemplate: ParsedTemplate;
	parsedBibliography: ParsedBibliography;
	parsedArticle: ParsedArticle;
	diagnostics: AppDiagnostic[];
	activePluginIds: PipelineExecutionResult["activePluginIds"];
};
