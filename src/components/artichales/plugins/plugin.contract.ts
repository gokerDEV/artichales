export type PluginCategory = "core" | "parser" | "render" | "editor";

export type PluginHooks = {
	setup?: () => void;
	parse?: unknown;
	process?: unknown;
	render?: unknown;
	editor?: unknown;
};

export type PluginDefinition = {
	id: string;
	name: string;
	category: PluginCategory;
	version?: string;
	description?: string;
	ownsSyntax?: string[];
	configSchema?: unknown;
	hooks: PluginHooks;
};
