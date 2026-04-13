import type { Root } from "mdast";
import type { HTMLAttributes, ReactNode } from "react";
import type { Components } from "react-markdown";
import type { Plugin } from "unified";
import type { ZodType } from "zod";
import type { DocumentSource } from "@/hooks/use-document";
import type { ResolvedCaption, ResolvedReference } from "@/lib/render-document";

/**
 * Functional pipeline categories (parser, editor) + content-based render categories.
 * Content categories map directly to template.json `components` config keys,
 * enabling per-category styling and config from the template.
 */
export type PluginCategory =
	// Functional
	| "parser"
	| "editor"
	| "document"
	// Document structure
	| "title"
	| "author"
	| "references"
	// Inline content
	| "cite"
	| "ref"
	// Block content
	| "code"
	| "math"
	// Directives
	| "abstract"
	| "table"
	| "figure"
	| "caption"
	| "map"
	| "equation";

export type DisplayAs =
	| "section"
	| "figure"
	| "table"
	| "equation"
	| "code"
	| "abstract";

export type DirectiveKind = "container" | "leaf" | "text";

export type PluginConfig = {
	captionPosition?: "top" | "bottom"; // deprecated
	defaultSpan?: "column" | "page";
	spacingBefore?: string;
	spacingAfter?: string;
	label?: string;
};

export type RenderHookContext = {
	target: "web" | "print";
	resolvedReferences: Record<string, ResolvedReference>;
	captions: Record<string, ResolvedCaption>;
	utilityClasses?: Record<string, string>;
};

export type CoreRenderHookContext = {
	document: DocumentSource;
	target: "web" | "print";
	className?: string;
};

export type DirectiveComponentProps = {
	node?: unknown;
	children?: ReactNode;
	directive: string;
	raw: string;
	params: Record<string, string>;
	config: PluginConfig;
	target: "web" | "print";
} & Omit<HTMLAttributes<HTMLDivElement>, "children">;

export type DirectiveRendererDefinition = {
	directive: string;
	category: PluginCategory;
	component: (props: DirectiveComponentProps) => ReactNode;
};

export type PluginHooks = {
	setup?: () => void;
	parse?: Plugin<[], Root>;
	process?: () => void;
	render?: (context: RenderHookContext) => Partial<Components>;
	directiveRender?: (
		context: RenderHookContext,
	) => DirectiveRendererDefinition | DirectiveRendererDefinition[] | null;
	coreRender?: (context: CoreRenderHookContext) => ReactNode;
	editor?: () => void;
};

export type PluginDefinition = {
	id: string;
	name: string;
	category: PluginCategory;
	displayAs?: DisplayAs;
	kind?: DirectiveKind;
	autocomplete?: boolean;
	version?: string;
	description?: string;
	configSchema?: ZodType<unknown>;
	hooks: PluginHooks;
};
