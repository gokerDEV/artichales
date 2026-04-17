import type {PluginDefinition} from "@/components/artichale/types/plugin.types.ts";
import type { Root } from "mdast";
import type { Frontmatter } from "@/components/artichale/schema/frontmatter.schema";
import type {
	HeadingEntry,
	LabeledBlockEntry,
} from "@/components/artichale/types/article.types";
import type {
	BibliographyById,
	RenderArtichaleResult,
} from "@/components/artichale/types/render.types";
import type { TemplateResolved } from "@/components/artichale/types/template.types";

export type ParseDiagnostic = {
	code:
		| "frontmatter-missing"
		| "frontmatter-invalid-yaml"
		| "frontmatter-schema-invalid"
		| "document-parse-failed"
		| "article-heading-parent-missing"
		| "article-heading-duplicate-label"
		| "article-labeled-block-duplicate-label"
		| "bibliography-entry-invalid";
	severity: "error" | "warning" | "info";
	source: "parser";
	message: string;
	offset?: number;
	line?: number;
	column?: number;
};

export type ParseArtichaleInput = {
	template: { data: string; lastModified: string };
	bibliography: { data: string; lastModified: string };
	markdown: { data: string; lastModified: string };
};

export type ParseArtichaleResult = {
	template: TemplateResolved;
	bibliography: BibliographyById;
	frontmatter: Frontmatter;
	ast: Root | null;
	headings: readonly HeadingEntry[];
	labeledBlocks: readonly LabeledBlockEntry[];
	citations: readonly string[];
	diagnostics: readonly ParseDiagnostic[];
	plugins: PluginDefinition[];
};

export type ArtichaleExecutionResult = {
	parse: ParseArtichaleResult;
	render: RenderArtichaleResult;
};
