import type { Pluggable } from "unified";
import type { ZodType } from "zod";

export type PluginCategory = "core" | "parser" | "render" | "editor";

export type PluginHooks = {
	setup?: () => void;
	parse?: Pluggable;
	process?: () => void;
	render?: () => void;
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
