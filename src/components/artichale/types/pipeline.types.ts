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
import type {
	ResolveTemplateResult,
	TemplateResolved,
} from "@/components/artichale/types/template.types";

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
	rawTemplate?: string;
	rawBibliography?: string;
	rawMarkdown: string;
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
	templateResult: ResolveTemplateResult;
};

export type ArtichaleExecutionResult = {
	parse: ParseArtichaleResult;
	render: RenderArtichaleResult;
};
