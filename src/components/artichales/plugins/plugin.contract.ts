import type { Root } from "mdast";
import type { HTMLAttributes, ReactNode } from "react";
import type { Components } from "react-markdown";
import type { Plugin } from "unified";
import type { ZodType } from "zod";
import type { DocumentSource } from "@/hooks/use-document";
import type { ResolvedReference } from "@/lib/article-analysis";

export type PluginCategory = "core" | "parser" | "render" | "editor";

export type DirectiveCategory =
	| "abstract"
	| "table"
	| "figure"
	| "map"
	| "equation"
	| "code";

export type DirectiveConfig = {
	captionPosition?: "top" | "bottom";
	defaultSpan?: "column" | "page";
	spacingBefore?: string;
	spacingAfter?: string;
	label?: string;
};

export type RenderHookContext = {
	refIndexById: Record<
		string,
		{
			kind: "plot" | "datatable";
			index: number;
		}
	>;
	target: "web" | "print";
	resolvedReferences: Record<string, ResolvedReference>;
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
	config: DirectiveConfig;
	target: "web" | "print";
} & Omit<HTMLAttributes<HTMLDivElement>, "children">;

export type DirectiveRendererDefinition = {
	directive: string;
	category: DirectiveCategory;
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
	directiveCategory?: DirectiveCategory;
	version?: string;
	description?: string;
	ownsSyntax?: string[];
	configSchema?: ZodType<unknown>;
	hooks: PluginHooks;
};
