import type { Root } from "mdast";
import type { Plugin } from "unified";
import { getPluginsByCategory } from "@/components/artichales/plugins/plugin.registry";
import type { PluginDefinition } from "./plugin.contract";

export type PluginExecutionState = {
	parser: PluginDefinition[];
	core: PluginDefinition[];
	render: PluginDefinition[];
	editor: PluginDefinition[];
	missingParserRuntimeIds: string[];
	missingRenderRuntimeIds: string[];
};

export function resolvePluginExecutionState(
	runtimePluginIds?: string[],
): PluginExecutionState {
	const parser = getPluginsByCategory("parser", runtimePluginIds);
	const core = getPluginsByCategory("core", runtimePluginIds);
	const render = getPluginsByCategory("render", runtimePluginIds);
	const editor = getPluginsByCategory("editor", runtimePluginIds);

	return {
		parser,
		core,
		render,
		editor,
		missingParserRuntimeIds: parser
			.filter((plugin) => !plugin.hooks.parse)
			.map((plugin) => plugin.id),
		missingRenderRuntimeIds: render
			.filter((plugin) => !plugin.hooks.render && !plugin.hooks.directiveRender)
			.map((plugin) => plugin.id),
	};
}

export function getParserRemarkPluginsFromExecutionState(
	state: PluginExecutionState,
): Array<Plugin<[], Root>> {
	return state.parser
		.map((plugin) => plugin.hooks.parse)
		.filter((plugin): plugin is Plugin<[], Root> => Boolean(plugin));
}
