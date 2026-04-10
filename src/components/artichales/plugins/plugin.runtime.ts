import type { Root } from "mdast";
import type { Plugin } from "unified";
import { loadPluginRegistry } from "@/components/artichales/plugins/plugin.registry";
import type { PluginDefinition } from "./plugin.contract";

export type PluginExecutionState = {
	parser: PluginDefinition[];
	core: PluginDefinition[];
	render: PluginDefinition[];
	editor: PluginDefinition[];
	missingParserRuntimeIds: string[];
	missingRenderRuntimeIds: string[];
};

const PARSER_CATEGORIES = new Set(["parser"]);
const EDITOR_CATEGORIES = new Set(["editor"]);

export function resolvePluginExecutionState(
	runtimePluginIds?: string[],
): PluginExecutionState {
	const all = loadPluginRegistry(runtimePluginIds);

	const parser = all.filter((p) => PARSER_CATEGORIES.has(p.category));
	const editor = all.filter((p) => EDITOR_CATEGORIES.has(p.category));
	const core = all.filter((p) => Boolean(p.hooks.coreRender));
	const render = all.filter(
		(p) => Boolean(p.hooks.render) || Boolean(p.hooks.directiveRender),
	);

	return {
		parser,
		core,
		render,
		editor,
		missingParserRuntimeIds: parser
			.filter((p) => !p.hooks.parse)
			.map((p) => p.id),
		missingRenderRuntimeIds: render
			.filter((p) => !p.hooks.render && !p.hooks.directiveRender)
			.map((p) => p.id),
	};
}

export function getParserRemarkPluginsFromExecutionState(
	state: PluginExecutionState,
): Array<Plugin<[], Root>> {
	return state.parser
		.map((plugin) => plugin.hooks.parse)
		.filter((plugin): plugin is Plugin<[], Root> => Boolean(plugin));
}
