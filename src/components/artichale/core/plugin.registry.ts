import { abstractPlugin } from "@/components/artichale/plugins/abstract.plugin";
import { citePlugin } from "@/components/artichale/plugins/cite.plugin";
import { codesamplePlugin } from "@/components/artichale/plugins/codesample.plugin";
import { datatablePlugin } from "@/components/artichale/plugins/datatable.plugin";
import { equationPlugin } from "@/components/artichale/plugins/equation.plugin";
import { figurePlugin } from "@/components/artichale/plugins/figure.plugin";
import { fnPlugin } from "@/components/artichale/plugins/fn.plugin";
import { plottyPlugin } from "@/components/artichale/plugins/plotty.plugin";
import { refPlugin } from "@/components/artichale/plugins/ref.plugin";
import {
	sectionPlugin,
	subsectionPlugin,
	subsubsectionPlugin,
} from "@/components/artichale/plugins/section.plugin";
import { tablePlugin } from "@/components/artichale/plugins/table.plugin";
import type {
	PluginDefinition,
	PluginRegistryMaps,
} from "@/components/artichale/types/plugin.types";

const BUILTIN_PLUGINS: PluginDefinition[] = [
	abstractPlugin,
	citePlugin,
	codesamplePlugin,
	datatablePlugin,
	equationPlugin,
	figurePlugin,
	fnPlugin,
	plottyPlugin,
	refPlugin,
	sectionPlugin,
	subsectionPlugin,
	subsubsectionPlugin,
	tablePlugin,
];

const BUILTIN_BY_ID = new Map(
	BUILTIN_PLUGINS.map((plugin) => [plugin.id, plugin]),
);

const DEFAULT_PLUGIN_IDS = BUILTIN_PLUGINS.map((plugin) => plugin.id);

export function listTemplateDirectivePlugins(): string[] {
	return [...DEFAULT_PLUGIN_IDS];
}

export function getDefaultTemplateDirectivePlugins(): string[] {
	return [...DEFAULT_PLUGIN_IDS];
}

export function resolvePlugins(
	templatePlugins: readonly string[],
): PluginDefinition[] {
	if (templatePlugins.length === 0) return [...BUILTIN_PLUGINS];

	const result: PluginDefinition[] = [];
	const seen = new Set<string>();

	for (const pluginId of templatePlugins) {
		if (seen.has(pluginId)) continue;
		seen.add(pluginId);
		const plugin = BUILTIN_BY_ID.get(pluginId);
		if (plugin) result.push(plugin);
	}

	return result.length > 0 ? result : [...BUILTIN_PLUGINS];
}

export function buildPluginRegistryMaps(
	plugins: readonly PluginDefinition[],
): PluginRegistryMaps {
	const byId = new Map<string, PluginDefinition>();
	const displayAsByPluginId = new Map<string, PluginDefinition["displayAs"]>();
	const directiveKindByPluginId = new Map<string, PluginDefinition["kind"]>();

	for (const plugin of plugins) {
		byId.set(plugin.id, plugin);
		displayAsByPluginId.set(plugin.id, plugin.displayAs);
		directiveKindByPluginId.set(plugin.id, plugin.kind);
	}

	return {
		byId,
		displayAsByPluginId,
		directiveKindByPluginId,
	};
}
