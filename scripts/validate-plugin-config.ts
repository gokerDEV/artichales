import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { loadPluginRegistry } from "../src/components/artichales/plugins/plugin.registry";
import { resolveTemplateFile } from "../src/lib/template";

type PluginRegistryEntry = {
	id: string;
	enabled?: boolean;
};

function readText(relativePath: string): string {
	return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

function dedupeRegistryEntries(entries: PluginRegistryEntry[]): PluginRegistryEntry[] {
	const seen = new Set<string>();
	const dedupedReversed: PluginRegistryEntry[] = [];
	for (let index = entries.length - 1; index >= 0; index--) {
		const entry = entries[index];
		if (!entry?.id || seen.has(entry.id)) continue;
		seen.add(entry.id);
		dedupedReversed.push(entry);
	}
	return dedupedReversed.reverse();
}

function extractFrontmatterPlugins(
	articleSource: string,
): Record<string, unknown> {
	const match = articleSource.match(/^---\n([\s\S]*?)\n---/);
	if (!match) return {};
	const parsed = parseYaml(match[1]);
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
	const plugins = (parsed as Record<string, unknown>).plugins;
	if (!plugins || typeof plugins !== "object" || Array.isArray(plugins)) {
		return {};
	}
	return plugins as Record<string, unknown>;
}

function validateBuildTimePluginConfiguration(): string[] {
	const errors: string[] = [];
	const templateRaw = readText("src/workspace/defaults/template.json");
	const articleRaw = readText("src/workspace/defaults/article.mda");
	const templateResult = resolveTemplateFile(templateRaw);

	if (templateResult.hasError) {
		for (const diagnostic of templateResult.diagnostics) {
			errors.push(`[template] ${diagnostic.message}`);
		}
		return errors;
	}

	const rawTemplate = JSON.parse(templateRaw) as Record<string, unknown>;
	const rawRegistry = Array.isArray(rawTemplate.plugins)
		? (rawTemplate.plugins as PluginRegistryEntry[])
		: [];
	const registryEntries = dedupeRegistryEntries(rawRegistry).filter(
		(entry) => entry.enabled !== false,
	);

	for (const entry of registryEntries) {
		const resolved = loadPluginRegistry([{ id: entry.id, enabled: true }]);
		if (resolved.length === 0) {
			errors.push(
				`[plugin] Unknown plugin id in template registry: "${entry.id}".`,
			);
		}
	}

	const frontmatterPluginMap = extractFrontmatterPlugins(articleRaw);
	const activePlugins = loadPluginRegistry(templateResult.template.plugins);
	for (const plugin of activePlugins) {
		if (!plugin.configSchema) continue;
		const candidateConfig = frontmatterPluginMap[plugin.id] ?? {};
		const parsed = plugin.configSchema.safeParse(candidateConfig);
		if (parsed.success) continue;
		const firstIssue = parsed.error.issues[0]?.message || "Unknown error";
		errors.push(
			`[plugin] Invalid config for "${plugin.id}" in default source frontmatter: ${firstIssue}`,
		);
	}

	return errors;
}

const errors = validateBuildTimePluginConfiguration();
if (errors.length > 0) {
	console.error("[build-time-plugin-validation] failed:");
	for (const error of errors) {
		console.error(`- ${error}`);
	}
	process.exit(1);
}

console.log("[build-time-plugin-validation] passed");
