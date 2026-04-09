import type { Pluggable } from "unified";
import {
	getPluginsByCategory,
	type PluginRegistryEntry,
} from "@/components/artichales/plugins/plugin.registry";
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
	registryEntries?: PluginRegistryEntry[],
): PluginExecutionState {
	const parser = getPluginsByCategory("parser", registryEntries);
	const core = getPluginsByCategory("core", registryEntries);
	const render = getPluginsByCategory("render", registryEntries);
	const editor = getPluginsByCategory("editor", registryEntries);

	return {
		parser,
		core,
		render,
		editor,
		missingParserRuntimeIds: parser
			.filter((plugin) => !plugin.hooks.parse)
			.map((plugin) => plugin.id),
		missingRenderRuntimeIds: render
			.filter((plugin) => !plugin.hooks.render)
			.map((plugin) => plugin.id),
	};
}

export function getParserRemarkPluginsFromExecutionState(
	state: PluginExecutionState,
): Pluggable[] {
	return state.parser
		.map((plugin) => plugin.hooks.parse)
		.filter((plugin): plugin is Pluggable => Boolean(plugin));
}
