import type { Pluggable } from "unified";
import { remarkAbstract } from "@/components/artichales/plugins/abstract.parser.plugin";
import { remarkCitation } from "@/components/artichales/plugins/citation.parser.plugin";
import { remarkDatatable } from "@/components/artichales/plugins/datatable.parser.plugin";
import { remarkMathEquation } from "@/components/artichales/plugins/math.parser.plugin";
import { remarkPlotty } from "@/components/artichales/plugins/plotty.parser.plugin";
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

const PARSER_PLUGIN_RUNTIME_MAP: Record<string, Pluggable> = {
	"citation-parser": remarkCitation,
	"abstract-parser": remarkAbstract,
	"plotty-parser": remarkPlotty,
	"datatable-parser": remarkDatatable,
	"math-parser": remarkMathEquation,
};

const RENDER_PLUGIN_RUNTIME_IDS = new Set([
	"abstract-render",
	"citation-render",
	"ref-render",
	"code-render",
	"plotty-render",
]);

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
			.filter((plugin) => !PARSER_PLUGIN_RUNTIME_MAP[plugin.id])
			.map((plugin) => plugin.id),
		missingRenderRuntimeIds: render
			.filter((plugin) => !RENDER_PLUGIN_RUNTIME_IDS.has(plugin.id))
			.map((plugin) => plugin.id),
	};
}

export function getParserRemarkPluginsFromExecutionState(
	state: PluginExecutionState,
): Pluggable[] {
	return state.parser
		.map((plugin) => PARSER_PLUGIN_RUNTIME_MAP[plugin.id])
		.filter((plugin): plugin is Pluggable => Boolean(plugin));
}
