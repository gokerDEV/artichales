import type { RootContent } from "mdast";
import type { ReactNode } from "react";
import type { ResolvedReference } from "@/components/artichale/types/reference.types";
import type {
	JSONAssetReader,
	RenderTarget,
} from "@/components/artichale/types/render.types";
import type { TemplateResolved } from "@/components/artichale/types/template.types";

export const DisplayAs = {
	ABSTRACT: "abstract",
	FIGURE: "figure",
	TABLE: "table",
	EQUATION: "equation",
	CODE: "code",
	SECTION: "section",
	SUBSECTION: "subsection",
	SUBSUBSECTION: "subsubsection",
	REF: "ref",
	CITE: "cite",
	LINK: "link",
} as const;

export type DisplayAs = (typeof DisplayAs)[keyof typeof DisplayAs];

export const DirectiveKind = {
	TEXT: "text",
	CONTAINER: "container",
} as const;

export type DirectiveKind = (typeof DirectiveKind)[keyof typeof DirectiveKind];

export type DirectiveNode = {
	type: "textDirective" | "leafDirective" | "containerDirective";
	name: string;
	attributes?: Record<string, string | null | undefined>;
	children?: RootContent[];
};

export type ParsedDirective = {
	id: string;
	label: string;
	dataFile: string;
	caption: string;
	attributes: Record<string, string>;
	children: RootContent[];
};

export type PluginRenderProps = {
	target: RenderTarget;
	template: TemplateResolved;
	node: DirectiveNode;
	fnJSONAssetReader?: JSONAssetReader;
	fnAsssetResolver?: (fileName: string) => Promise<{
		fileName: string;
		resolvedSrc: string;
		mimeType?: string;
		lastModified?: number;
	} | null>;
	resolvedReferences: Record<string, ResolvedReference>;
};

export type PluginDefinition = {
	id: string;
	name: string;
	displayAs: DisplayAs;
	kind: DirectiveKind;
	autocomplete: boolean;
	version?: string;
	description?: string;
	render: (props: PluginRenderProps) => ReactNode | Promise<ReactNode>;
};

export type PluginRegistryMaps = {
	byId: ReadonlyMap<string, PluginDefinition>;
	displayAsByPluginId: ReadonlyMap<string, DisplayAs>;
	directiveKindByPluginId: ReadonlyMap<string, DirectiveKind>;
};
