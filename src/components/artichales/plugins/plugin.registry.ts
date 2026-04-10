import { abstractDirectivePlugin } from "./abstract.directive.plugin";
import { citationEditorPlugin } from "./citation.editor.plugin";
import { citationParserPlugin } from "./citation.parser.plugin";
import { citationRenderPlugin } from "./citation.render.plugin";
import { codeRenderPlugin } from "./code.render.plugin";
import { datatableDirectivePlugin } from "./datatable.directive.plugin";
import { mathParserPlugin } from "./math.parser.plugin";
import { plottyDirectivePlugin } from "./plotty.directive.plugin";
import type { PluginCategory, PluginDefinition } from "./plugin.contract";
import { refRenderPlugin } from "./ref.render.plugin";
import { referencesCorePlugin } from "./references.core.plugin";
import { titleCorePlugin } from "./title.core.plugin";

// Core plugins always active regardless of template config.
const CORE_PLUGINS: PluginDefinition[] = [
	citationParserPlugin,
	mathParserPlugin,
	titleCorePlugin,
	referencesCorePlugin,
	citationRenderPlugin,
	refRenderPlugin,
	codeRenderPlugin,
	citationEditorPlugin,
];

// Directive plugins activated by template `plugins` field.
// Plugin id matches the directive name it handles.
const DIRECTIVE_PLUGINS: PluginDefinition[] = [
	abstractDirectivePlugin,
	datatableDirectivePlugin,
	plottyDirectivePlugin,
];

const DIRECTIVE_PLUGINS_BY_ID = new Map(
	DIRECTIVE_PLUGINS.map((plugin) => [plugin.id, plugin]),
);

const ALL_PLUGINS = [...CORE_PLUGINS, ...DIRECTIVE_PLUGINS];
const ALL_PLUGINS_BY_ID = new Map(
	ALL_PLUGINS.map((plugin) => [plugin.id, plugin]),
);

const DEFAULT_DIRECTIVE_PLUGIN_IDS = DIRECTIVE_PLUGINS.map((p) => p.id);

export function listTemplateDirectivePlugins(): string[] {
	return DIRECTIVE_PLUGINS.map((p) => p.id);
}

export function getDefaultTemplateDirectivePlugins(): string[] {
	return [...DEFAULT_DIRECTIVE_PLUGIN_IDS];
}

/**
 * Resolves the full runtime plugin id list from template `plugins` field.
 * Core plugins are always included. Directive plugins are added by their id.
 */
export function resolveRuntimePluginIdsFromTemplate(
	templatePlugins?: string[],
): string[] {
	const coreIds = CORE_PLUGINS.map((p) => p.id);
	const directiveIds =
		Array.isArray(templatePlugins) && templatePlugins.length > 0
			? templatePlugins.filter((id) => DIRECTIVE_PLUGINS_BY_ID.has(id))
			: [...DEFAULT_DIRECTIVE_PLUGIN_IDS];

	return [...new Set([...coreIds, ...directiveIds])];
}

export function loadPluginRegistry(
	runtimePluginIds?: string[],
): PluginDefinition[] {
	if (!runtimePluginIds || runtimePluginIds.length === 0) {
		return [...ALL_PLUGINS];
	}
	const seen = new Set<string>();
	const resolved: PluginDefinition[] = [];
	for (const id of runtimePluginIds) {
		if (seen.has(id)) continue;
		seen.add(id);
		const plugin = ALL_PLUGINS_BY_ID.get(id);
		if (plugin) resolved.push(plugin);
	}
	return resolved;
}

export function getPluginsByCategory(
	category: PluginCategory,
	runtimePluginIds?: string[],
): PluginDefinition[] {
	return loadPluginRegistry(runtimePluginIds).filter(
		(plugin) => plugin.category === category,
	);
}
