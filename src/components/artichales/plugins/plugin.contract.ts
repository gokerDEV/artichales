import type { Root } from "mdast";
import type { Components } from "react-markdown";
import type { Plugin } from "unified";
import type { ZodType } from "zod";
import type { ResolvedReference } from "@/lib/article-analysis";

export type PluginCategory = "core" | "parser" | "render" | "editor";

export type RenderHookContext = {
	plotFiles: Record<string, unknown>;
	plotIndexById: Record<string, number>;
	datatableIndexById: Record<string, number>;
	refIndexById: Record<
		string,
		{
			kind: "plot" | "datatable";
			index: number;
		}
	>;
	target: "web" | "print";
	resolvedReferences: Record<string, ResolvedReference>;
	templateDefaults?: {
		figure?: {
			captionPosition?: "top" | "bottom";
			defaultSpan?: "column" | "full";
			spacingBefore?: string;
			spacingAfter?: string;
		};
		table?: {
			captionPosition?: "top" | "bottom";
			defaultSpan?: "column" | "full";
			spacingBefore?: string;
			spacingAfter?: string;
		};
	};
	referenceLabels?: Record<string, string>;
	utilityClasses?: Record<string, string>;
};

export type PluginHooks = {
	setup?: () => void;
	parse?: Plugin<[], Root>;
	process?: () => void;
	render?: (context: RenderHookContext) => Partial<Components>;
	editor?: () => void;
};

export type PluginDefinition = {
	id: string;
	name: string;
	category: PluginCategory;
	version?: string;
	description?: string;
	ownsSyntax?: string[];
	configSchema?: ZodType<unknown>;
	hooks: PluginHooks;
};
