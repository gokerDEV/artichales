import type { Root } from "mdast";
import type { ReactNode } from "react";
import type { Frontmatter } from "@/components/artichale/schema/frontmatter.schema";
import type { TemplateResolved } from "@/components/artichale/types/template.types";

export type RenderTarget = "web" | "print";

export type JSONAssetReadResult<T = unknown> = {
	data: T;
	lastModified?: number;
};

export type JSONAssetReader = <T = unknown>(
	fileName: string,
) => Promise<JSONAssetReadResult<T>>;

export type AssetResolverResult = {
	fileName: string;
	resolvedSrc: string;
	mimeType?: string;
	lastModified?: number;
};

export type AssetResolver = (
	fileName: string,
) => Promise<AssetResolverResult | null>;

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
	fnAsssetResolver?: AssetResolver;
	template: TemplateResolved;
	bibliography: BibliographyById;
	frontmatter: Frontmatter;
	ast: Root | null;
	citations: readonly string[];
};

export type RenderArtichaleResult = {
	title: ReactNode;
	authors: ReactNode;
	article: ReactNode;
	references: ReactNode;
	diagnostics: readonly RenderDiagnostic[];
};
