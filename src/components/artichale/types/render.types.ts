import type { PluginDefinition } from "@/components/artichale/types/plugin.types.ts";
import type { Root } from "mdast";
import type { ReactNode } from "react";
import type { Frontmatter } from "@/components/artichale/schema/frontmatter.schema";
import type {
	HeadingEntry,
	LabeledBlockEntry,
} from "@/components/artichale/types/article.types";
import type { TemplateResolved } from "@/components/artichale/types/template.types";

export type RenderTarget = "web" | "print";

export type JSONAssetReadResult<T = unknown> = {
	data: T;
	lastModified: string;
};

export type JSONAssetReader = <T = unknown>(
	fileName: string,
	lastModified: string,
) => Promise<JSONAssetReadResult<T>>;

export type AssetResolverResult = {
	fileName: string;
	resolvedSrc: string;
	mimeType?: string;
	lastModified: string;
};

export type AssetResolver = (fileName: string) => Promise<AssetResolverResult>;

export type BibliographyEntry = {
	key: string;
	type: string;
	title: string;
	author?: string;
	year?: string;
	journal?: string;
	publisher?: string;
	url?: string;
	fields: Record<string, string>;
};

export type BibliographyById = Readonly<Record<string, BibliographyEntry>>;

export type RenderDiagnostic = {
	code:
		| "render-plugin-missing"
		| "render-plugin-failed"
		| "render-node-unsupported"
		| "render-bibliography-missing-entry";
	severity: "error" | "warning" | "info";
	source: "render" | "plugin";
	message: string;
	pluginId?: string;
};

export type RenderArtichaleInput = {
	target: RenderTarget;
	fnJSONAssetReader?: JSONAssetReader;
	fnAssetResolver?: AssetResolver;
	lastModified?: {
		markdown?: string;
		template?: string;
		bibliography?: string;
	};
	template: TemplateResolved;
	bibliography: BibliographyById;
	frontmatter: Frontmatter;
	ast: Root | null;
	headings: readonly HeadingEntry[];
	labeledBlocks: readonly LabeledBlockEntry[];
	citations: readonly string[];
	plugins: PluginDefinition[];
};

export type RenderArtichaleResult = {
	title: ReactNode;
	authors: ReactNode;
	article: ReactNode;
	references: ReactNode;
	diagnostics: readonly RenderDiagnostic[];
};
