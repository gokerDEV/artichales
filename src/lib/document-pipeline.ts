import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { parse as parseYaml } from "yaml";
import { loadPluginRegistry } from "@/components/artichales/plugins/plugin.registry";
import { resolvePluginExecutionState } from "@/components/artichales/plugins/plugin.runtime";
import {
	type ArticleAnalysisDiagnostic,
	analyzeArticleSource,
	type ResolvedReference,
} from "@/lib/article-analysis";
import type {
	BibtexDiagnostic,
	CitationEntry,
	ValidatedBibEntry,
} from "@/lib/bibtex";
import { parseBibtexDocument } from "@/lib/bibtex";
import {
	resolveTemplateFile,
	type TemplateDiagnostic,
	type TemplateFileResolved,
} from "@/lib/template";
import {
	CORE_ARTICLE_FILE,
	CORE_BIB_FILE,
	CORE_TEMPLATE_FILE,
} from "@/lib/workspace";

type PipelineStage =
	| "validate-template"
	| "validate-bibliography"
	| "parse-article"
	| "normalize-document"
	| "build-registry-and-numbering"
	| "plugin-processing"
	| "render-active-target";

export type PipelineDiagnostic = {
	code:
		| "pipeline-stage-complete"
		| "article-frontmatter-missing"
		| "article-frontmatter-invalid"
		| "article-footnote-unsupported"
		| "asset-json-invalid"
		| "plugin-config-invalid"
		| "plugin-config-map-invalid"
		| "plugin-runtime-missing"
		| "plugin-hook-failed";
	severity: "error" | "warning" | "info";
	source: "pipeline" | "parser" | "plugin";
	message: string;
	stage?: PipelineStage;
	fileName?: string;
	pluginId?: string;
};

export type PipelineResult = {
	content: string;
	frontmatter: Record<string, unknown>;
	citations: Record<string, CitationEntry>;
	validatedBibEntries: Record<string, ValidatedBibEntry>;
	plots: Record<string, unknown>;
	template: TemplateFileResolved;
	templateDiagnostics: TemplateDiagnostic[];
	bibDiagnostics: BibtexDiagnostic[];
	assetDiagnostics: PipelineDiagnostic[];
	articleDiagnostics: Array<PipelineDiagnostic | ArticleAnalysisDiagnostic>;
	resolvedReferences: Record<string, ResolvedReference>;
	activePluginIds: {
		parser: string[];
		core: string[];
		render: string[];
		editor: string[];
	};
	pipelineDiagnostics: PipelineDiagnostic[];
};

function getStageInfoMessage(
	stage: PipelineStage,
	target: "web" | "print",
): string {
	const labels: Record<PipelineStage, string> = {
		"validate-template": "Template validation stage completed.",
		"validate-bibliography": "Bibliography validation stage completed.",
		"parse-article": "Article parsing stage completed.",
		"normalize-document": "Document normalization stage completed.",
		"build-registry-and-numbering": "Registry and numbering stage completed.",
		"plugin-processing": "Plugin processing stage completed.",
		"render-active-target": `Active target render stage completed for "${target}".`,
	};
	return labels[stage];
}

function parseArticleContent(articleText: string): {
	content: string;
	frontmatter: Record<string, unknown>;
	diagnostics: PipelineDiagnostic[];
} {
	const match = articleText.match(/^---\n([\s\S]*?)\n---/);
	if (!match) {
		return {
			content: articleText,
			frontmatter: {},
			diagnostics: [
				{
					code: "article-frontmatter-missing",
					severity: "error",
					source: "parser",
					message:
						"`article.mda` frontmatter is required. Preview is blocked until it is added.",
					stage: "parse-article",
				},
			],
		};
	}

	try {
		const parsed = parseYaml(match[1]);
		return {
			content: articleText.slice(match[0].length).trim(),
			frontmatter:
				typeof parsed === "object" && parsed !== null
					? (parsed as Record<string, unknown>)
					: {},
			diagnostics: [],
		};
	} catch {
		return {
			content: articleText,
			frontmatter: {},
			diagnostics: [
				{
					code: "article-frontmatter-invalid",
					severity: "error",
					source: "parser",
					message:
						"`article.mda` frontmatter YAML is invalid. Preview is blocked until fixed.",
					stage: "parse-article",
				},
			],
		};
	}
}

function detectUnsupportedSourceConcepts(
	content: string,
): PipelineDiagnostic[] {
	const diagnostics: PipelineDiagnostic[] = [];
	const hasFootnoteReference = /\[\^[^\]]+\]/.test(content);
	const hasFootnoteDefinition = /^\[\^[^\]]+\]:/m.test(content);
	if (hasFootnoteReference || hasFootnoteDefinition) {
		diagnostics.push({
			code: "article-footnote-unsupported",
			severity: "error",
			source: "parser",
			stage: "parse-article",
			message:
				"Footnotes are out of scope for v1 and must be removed from `article.mda`.",
		});
	}
	return diagnostics;
}

function parseAssetJsonFiles(files: Record<string, string>): {
	plots: Record<string, unknown>;
	diagnostics: PipelineDiagnostic[];
} {
	const plots: Record<string, unknown> = {};
	const diagnostics: PipelineDiagnostic[] = [];
	for (const [fileName, fileContent] of Object.entries(files)) {
		if (
			!fileName.endsWith(".json") ||
			fileName === CORE_TEMPLATE_FILE ||
			fileName === CORE_ARTICLE_FILE ||
			fileName === CORE_BIB_FILE
		) {
			continue;
		}
		try {
			plots[fileName] = JSON.parse(fileContent);
		} catch {
			plots[fileName] = null;
			diagnostics.push({
				code: "asset-json-invalid",
				severity: "error",
				source: "parser",
				fileName,
				message: `Asset JSON is invalid: ${fileName}`,
				stage: "normalize-document",
			});
		}
	}
	return { plots, diagnostics };
}

function parsePluginConfigMap(frontmatter: Record<string, unknown>): {
	configMap: Record<string, unknown>;
	diagnostics: PipelineDiagnostic[];
} {
	const rawPlugins = frontmatter.plugins;
	if (rawPlugins === undefined) {
		return { configMap: {}, diagnostics: [] };
	}
	if (
		typeof rawPlugins !== "object" ||
		rawPlugins === null ||
		Array.isArray(rawPlugins)
	) {
		return {
			configMap: {},
			diagnostics: [
				{
					code: "plugin-config-map-invalid",
					severity: "error",
					source: "plugin",
					stage: "plugin-processing",
					message:
						"Frontmatter `plugins` must be an object map keyed by plugin id.",
				},
			],
		};
	}
	return {
		configMap: rawPlugins as Record<string, unknown>,
		diagnostics: [],
	};
}

function validatePluginConfigs(
	configMap: Record<string, unknown>,
	templatePlugins: Array<{ id: string; enabled: boolean }> | undefined,
): PipelineDiagnostic[] {
	const diagnostics: PipelineDiagnostic[] = [];
	const activePlugins = loadPluginRegistry(templatePlugins);

	for (const plugin of activePlugins) {
		if (!plugin.configSchema) continue;
		const candidateConfig = configMap[plugin.id] ?? {};
		const parsed = plugin.configSchema.safeParse(candidateConfig);
		if (parsed.success) continue;

		const issueMessage =
			parsed.error.issues[0]?.message ||
			"Unknown plugin config validation error.";
		diagnostics.push({
			code: "plugin-config-invalid",
			severity: "error",
			source: "plugin",
			pluginId: plugin.id,
			stage: "plugin-processing",
			message: `Plugin config is invalid for "${plugin.id}": ${issueMessage}`,
		});
	}

	return diagnostics;
}

function validatePluginRuntimeAvailability(
	templatePlugins: Array<{ id: string; enabled: boolean }> | undefined,
): {
	diagnostics: PipelineDiagnostic[];
	activePluginIds: PipelineResult["activePluginIds"];
} {
	const executionState = resolvePluginExecutionState(templatePlugins);
	const diagnostics: PipelineDiagnostic[] = [];

	for (const parserPluginId of executionState.missingParserRuntimeIds) {
		diagnostics.push({
			code: "plugin-runtime-missing",
			severity: "error",
			source: "plugin",
			pluginId: parserPluginId,
			stage: "plugin-processing",
			message: `Parser runtime hook is missing for plugin "${parserPluginId}".`,
		});
	}
	for (const renderPluginId of executionState.missingRenderRuntimeIds) {
		diagnostics.push({
			code: "plugin-runtime-missing",
			severity: "error",
			source: "plugin",
			pluginId: renderPluginId,
			stage: "plugin-processing",
			message: `Render runtime hook is missing for plugin "${renderPluginId}".`,
		});
	}

	return {
		diagnostics,
		activePluginIds: {
			parser: executionState.parser.map((plugin) => plugin.id),
			core: executionState.core.map((plugin) => plugin.id),
			render: executionState.render.map((plugin) => plugin.id),
			editor: executionState.editor.map((plugin) => plugin.id),
		},
	};
}

function executeParserHooks(
	articleContent: string,
	templatePlugins: Array<{ id: string; enabled: boolean }> | undefined,
): PipelineDiagnostic[] {
	const diagnostics: PipelineDiagnostic[] = [];
	const executionState = resolvePluginExecutionState(templatePlugins);

	for (const plugin of executionState.parser) {
		const parseHook = plugin.hooks.parse;
		if (!parseHook) continue;

		try {
			const processor = unified()
				.use(remarkParse)
				.use(remarkGfm)
				.use(remarkDirective)
				.use(parseHook);
			const tree = processor.parse(articleContent);
			processor.runSync(tree);
		} catch (error) {
			const detail = error instanceof Error ? error.message : String(error);
			diagnostics.push({
				code: "plugin-hook-failed",
				severity: "error",
				source: "plugin",
				pluginId: plugin.id,
				stage: "plugin-processing",
				message: `Parser hook failed for "${plugin.id}": ${detail}`,
			});
		}
	}

	return diagnostics;
}

function executeVoidHooks(
	plugins: Array<{
		id: string;
		hooks: { process?: () => void; render?: () => void };
	}>,
	stage: PipelineStage,
	hook: "process" | "render",
): PipelineDiagnostic[] {
	const diagnostics: PipelineDiagnostic[] = [];

	for (const plugin of plugins) {
		const hookFn = plugin.hooks[hook];
		if (!hookFn) continue;

		try {
			hookFn();
		} catch (error) {
			const detail = error instanceof Error ? error.message : String(error);
			diagnostics.push({
				code: "plugin-hook-failed",
				severity: "error",
				source: "plugin",
				pluginId: plugin.id,
				stage,
				message: `${hook === "process" ? "Process" : "Render"} hook failed for "${plugin.id}": ${detail}`,
			});
		}
	}

	return diagnostics;
}

function executePluginHooks(
	articleContent: string,
	templatePlugins: Array<{ id: string; enabled: boolean }> | undefined,
): PipelineDiagnostic[] {
	const executionState = resolvePluginExecutionState(templatePlugins);
	return [
		...executeParserHooks(articleContent, templatePlugins),
		...executeVoidHooks(executionState.core, "plugin-processing", "process"),
		...executeVoidHooks(
			executionState.render,
			"render-active-target",
			"render",
		),
	];
}

function emitPluginTrace(
	templatePlugins: Array<{ id: string; enabled: boolean }> | undefined,
	pluginConfigDiagnostics: PipelineDiagnostic[],
): void {
	if (!import.meta.env.DEV) return;
	const activePlugins = loadPluginRegistry(templatePlugins).map((p) => p.id);
	const failedPlugins = pluginConfigDiagnostics
		.map((diag) => diag.pluginId)
		.filter((id): id is string => typeof id === "string");

	console.groupCollapsed("[artichales:pipeline] plugin-processing");
	console.debug("activePlugins", activePlugins);
	console.debug("configValidationErrors", pluginConfigDiagnostics.length);
	if (failedPlugins.length > 0) {
		console.debug("failedPlugins", failedPlugins);
	}
	console.groupEnd();
}

export function runDocumentPipeline(
	files: Record<string, string>,
	target: "web" | "print",
): PipelineResult {
	const stageDiagnostics: PipelineDiagnostic[] = [];
	const shouldEmitStageInfo = import.meta.env.DEV;
	const pushStage = (stage: PipelineStage) => {
		if (!shouldEmitStageInfo) return;
		stageDiagnostics.push({
			code: "pipeline-stage-complete",
			severity: "info",
			source: "pipeline",
			message: getStageInfoMessage(stage, target),
			stage,
		});
	};

	const templateResult = resolveTemplateFile(files[CORE_TEMPLATE_FILE]);
	pushStage("validate-template");

	const bibResult = parseBibtexDocument(files[CORE_BIB_FILE] || "");
	pushStage("validate-bibliography");

	const articleResult = parseArticleContent(files[CORE_ARTICLE_FILE] || "");
	pushStage("parse-article");

	const assetResult = parseAssetJsonFiles(files);
	pushStage("normalize-document");

	const articleAnalysis = analyzeArticleSource(
		articleResult.content,
		templateResult.template.default.referenceLabels,
	);
	pushStage("build-registry-and-numbering");
	const unsupportedConceptDiagnostics = detectUnsupportedSourceConcepts(
		articleResult.content,
	);

	const pluginMapResult = parsePluginConfigMap(articleResult.frontmatter);
	const pluginConfigDiagnostics = validatePluginConfigs(
		pluginMapResult.configMap,
		templateResult.template.plugins,
	);
	const pluginRuntimeResult = validatePluginRuntimeAvailability(
		templateResult.template.plugins,
	);
	const pluginHookDiagnostics = executePluginHooks(
		articleResult.content,
		templateResult.template.plugins,
	);
	emitPluginTrace(templateResult.template.plugins, [
		...pluginConfigDiagnostics,
		...pluginRuntimeResult.diagnostics,
		...pluginHookDiagnostics,
	]);
	pushStage("plugin-processing");
	pushStage("render-active-target");

	return {
		content: articleResult.content,
		frontmatter: articleResult.frontmatter,
		citations: bibResult.citations,
		validatedBibEntries: bibResult.validatedEntries,
		plots: assetResult.plots,
		template: templateResult.template,
		templateDiagnostics: templateResult.diagnostics,
		bibDiagnostics: bibResult.diagnostics,
		assetDiagnostics: assetResult.diagnostics,
		articleDiagnostics: [
			...articleResult.diagnostics,
			...unsupportedConceptDiagnostics,
			...articleAnalysis.diagnostics,
			...pluginMapResult.diagnostics,
			...pluginConfigDiagnostics,
			...pluginRuntimeResult.diagnostics,
			...pluginHookDiagnostics,
		],
		resolvedReferences: articleAnalysis.resolvedReferences,
		activePluginIds: pluginRuntimeResult.activePluginIds,
		pipelineDiagnostics: stageDiagnostics,
	};
}
