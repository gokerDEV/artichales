import { abstractParserPlugin } from "./abstract.parser.plugin";
import { abstractRenderPlugin } from "./abstract.render.plugin";
import { citationCorePlugin } from "./citation.core.plugin";
import { citationEditorPlugin } from "./citation.editor.plugin";
import { citationParserPlugin } from "./citation.parser.plugin";
import { citationRenderPlugin } from "./citation.render.plugin";
import { codeRenderPlugin } from "./code.render.plugin";
import { datatableParserPlugin } from "./datatable.parser.plugin";
import { mathParserPlugin } from "./math.parser.plugin";
import { plottyParserPlugin } from "./plotty.parser.plugin";
import { plottyRenderPlugin } from "./plotty.render.plugin";
import type { PluginCategory, PluginDefinition } from "./plugin.contract";
import { refRenderPlugin } from "./ref.render.plugin";
import { referencesCorePlugin } from "./references.core.plugin";
import { titleCorePlugin } from "./title.core.plugin";

const BUILTIN_PLUGINS: PluginDefinition[] = [
	citationParserPlugin,
	abstractParserPlugin,
	plottyParserPlugin,
	datatableParserPlugin,
	mathParserPlugin,
	citationCorePlugin,
	referencesCorePlugin,
	titleCorePlugin,
	abstractRenderPlugin,
	citationRenderPlugin,
	refRenderPlugin,
	codeRenderPlugin,
	plottyRenderPlugin,
	citationEditorPlugin,
];

export type PluginRegistryEntry = {
	id: string;
	enabled?: boolean;
};

export function loadPluginRegistry(
	registryEntries?: PluginRegistryEntry[],
): PluginDefinition[] {
	if (!registryEntries || registryEntries.length === 0) {
		return [...BUILTIN_PLUGINS];
	}

	const builtinById = new Map(
		BUILTIN_PLUGINS.map((plugin) => [plugin.id, plugin]),
	);
	const resolved: PluginDefinition[] = [];
	const seen = new Set<string>();

	for (const entry of registryEntries) {
		if (seen.has(entry.id)) continue;
		seen.add(entry.id);
		const plugin = builtinById.get(entry.id);
		if (!plugin) continue;
		if (entry.enabled === false) continue;
		resolved.push(plugin);
	}

	return resolved;
}

export function getPluginsByCategory(
	category: PluginCategory,
	registryEntries?: PluginRegistryEntry[],
): PluginDefinition[] {
	return loadPluginRegistry(registryEntries).filter(
		(plugin) => plugin.category === category,
	);
}
