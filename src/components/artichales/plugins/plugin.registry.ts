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

const BUILTIN_BY_ID = new Map(BUILTIN_PLUGINS.map((plugin) => [plugin.id, plugin]));

const ALWAYS_ON_PLUGIN_IDS = [
	"citation-parser",
	"math-parser",
	"citation-core",
	"references-core",
	"title-core",
	"citation-render",
	"ref-render",
	"code-render",
	"citation-editor",
] as const;

const DIRECTIVE_PLUGIN_GROUPS: Record<string, string[]> = {
	abstract: ["abstract-parser", "abstract-render"],
	plotty: ["plotty-parser", "plotty-render"],
	datatable: ["datatable-parser"],
};

const DEFAULT_DIRECTIVE_PLUGINS = ["abstract", "plotty", "datatable"] as const;

export function getDefaultTemplateDirectivePlugins(): string[] {
	return [...DEFAULT_DIRECTIVE_PLUGINS];
}

export function listTemplateDirectivePlugins(): string[] {
	return Object.keys(DIRECTIVE_PLUGIN_GROUPS);
}

export function resolveRuntimePluginIdsFromTemplate(
	templateDirectivePlugins?: string[],
): string[] {
	const runtimeIds: string[] = [...ALWAYS_ON_PLUGIN_IDS];
	const requestedDirectives =
		Array.isArray(templateDirectivePlugins) && templateDirectivePlugins.length > 0
			? templateDirectivePlugins
			: [...DEFAULT_DIRECTIVE_PLUGINS];

	for (const directive of requestedDirectives) {
		for (const pluginId of DIRECTIVE_PLUGIN_GROUPS[directive] || []) {
			runtimeIds.push(pluginId);
		}
	}

	const deduped: string[] = [];
	const seen = new Set<string>();
	for (const id of runtimeIds) {
		if (seen.has(id)) continue;
		seen.add(id);
		deduped.push(id);
	}
	return deduped;
}

export function getOwnedSyntaxByRuntimePluginIds(
	runtimePluginIds?: string[],
): string[] {
	const syntax = new Set<string>();
	for (const plugin of loadPluginRegistry(runtimePluginIds)) {
		for (const owned of plugin.ownsSyntax || []) {
			syntax.add(owned);
		}
	}
	return [...syntax];
}

export function loadPluginRegistry(
	runtimePluginIds?: string[],
): PluginDefinition[] {
	if (!runtimePluginIds || runtimePluginIds.length === 0) {
		return [...BUILTIN_PLUGINS];
	}

	const resolved: PluginDefinition[] = [];
	const dedupedReversed: string[] = [];
	const seen = new Set<string>();
	for (let index = runtimePluginIds.length - 1; index >= 0; index--) {
		const pluginId = runtimePluginIds[index];
		if (seen.has(pluginId)) continue;
		seen.add(pluginId);
		dedupedReversed.push(pluginId);
	}
	const dedupedEntries = dedupedReversed.reverse();

	for (const pluginId of dedupedEntries) {
		const plugin = BUILTIN_BY_ID.get(pluginId);
		if (!plugin) continue;
		resolved.push(plugin);
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
