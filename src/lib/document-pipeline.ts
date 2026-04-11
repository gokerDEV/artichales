import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import type { Processor } from "unified";
import { unified } from "unified";
import type { VFile } from "vfile";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import type { RenderHookContext } from "@/components/artichales/plugins/plugin.contract";
import {
	loadPluginRegistry,
	resolveRuntimePluginIdsFromTemplate,
} from "@/components/artichales/plugins/plugin.registry";
import { resolvePluginExecutionState } from "@/components/artichales/plugins/plugin.runtime";
import {
	type ArticleAnalysisDiagnostic,
	analyzeArticleSource,
	type ReferenceSelectorTarget,
	type ResolvedCaption,
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
		| "article-frontmatter-schema-invalid"
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
	offset?: number;
	line?: number;
	column?: number;
};

export type PipelineResult = {
	ast: Root | null;
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
	captions: Record<string, ResolvedCaption>;
	referenceTargets: ReferenceSelectorTarget[];
	activePluginIds: {
		parser: string[];
		core: string[];
		render: string[];
		editor: string[];
	};
	pipelineDiagnostics: PipelineDiagnostic[];
};

export type DocumentModel = {
	ast: Root | null;
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
	captions: Record<string, ResolvedCaption>;
	referenceTargets: ReferenceSelectorTarget[];
	activePluginIds: {
		parser: string[];
		core: string[];
		render: string[];
		editor: string[];
	};
	runtimePluginIds: string[] | undefined;
	pipelineDiagnostics: PipelineDiagnostic[];
};

// Unified diagnostic type for UI/state layers.
export type AppDiagnostic =
	| TemplateDiagnostic
	| BibtexDiagnostic
	| PipelineDiagnostic
	| ArticleAnalysisDiagnostic;

// Shape posted from the worker back to the UI/store.
export type PipelineResultPayload = {
	ast: PipelineResult["ast"];
	content: PipelineResult["content"];
	frontmatter: PipelineResult["frontmatter"];
	citations: PipelineResult["citations"];
	validatedBibEntries: PipelineResult["validatedBibEntries"];
	plots: PipelineResult["plots"];
	template: PipelineResult["template"];
	citationStyle: string;
	referenceRegistry: PipelineResult["resolvedReferences"];
	captions: PipelineResult["captions"];
	referenceTargets: PipelineResult["referenceTargets"];
	diagnostics: AppDiagnostic[];
	activePluginIds: PipelineResult["activePluginIds"];
};

const FrontmatterOptionalString = z.union([z.string(), z.null()]).optional();

const FrontmatterPersonSchema = z
	.object({
		name: z.string().trim().min(1),
		affiliation: FrontmatterOptionalString,
		orcid: FrontmatterOptionalString,
		email: z.union([z.string(), z.array(z.string()), z.null()]).optional(),
		address: z.union([z.string(), z.array(z.string()), z.null()]).optional(),
		corresponding: z.boolean().optional(),
	})
	.passthrough();

const FrontmatterLicenseSchema = z
	.object({
		name: FrontmatterOptionalString,
		text: FrontmatterOptionalString,
		url: FrontmatterOptionalString,
	})
	.passthrough();

const FrontmatterJournalSchema = z
	.object({
		name: FrontmatterOptionalString,
		issn: FrontmatterOptionalString,
		eissn: FrontmatterOptionalString,
		volume: z.union([z.string(), z.number(), z.null()]).optional(),
		issue: z.union([z.string(), z.number(), z.null()]).optional(),
		pages: FrontmatterOptionalString,
	})
	.passthrough();

const FrontmatterConferenceSchema = z
	.object({
		name: FrontmatterOptionalString,
		location: FrontmatterOptionalString,
		date: FrontmatterOptionalString,
		proceedings: FrontmatterOptionalString,
		pages: FrontmatterOptionalString,
	})
	.passthrough();

const ArticleFrontmatterSchema = z
	.object({
		title: z.string().trim().min(1),
		shortTitle: FrontmatterOptionalString,
		authors: z
			.union([
				z.string().trim().min(1),
				z.array(z.union([z.string().trim().min(1), FrontmatterPersonSchema])),
			])
			.optional(),
		keywords: z.array(z.string().trim().min(1)).optional(),
		doi: FrontmatterOptionalString,
		receivedAt: FrontmatterOptionalString,
		acceptedAt: FrontmatterOptionalString,
		publishedAt: FrontmatterOptionalString,
		versionDate: FrontmatterOptionalString,
		type: FrontmatterOptionalString,
		license: FrontmatterLicenseSchema.optional(),
		journal: FrontmatterJournalSchema.optional(),
		conference: FrontmatterConferenceSchema.optional(),
		editors: z.array(FrontmatterPersonSchema).optional(),
		plugins: z.record(z.string(), z.unknown()).optional(),
	})
	.passthrough();

function getStageInfoMessage(
	stage: PipelineStage,
	target: "web" | "print" = "web",
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
	const atOffset = (offset: number) => {
		const safeOffset = Math.max(0, Math.min(offset, articleText.length));
		let line = 1;
		let column = 1;
		for (let index = 0; index < safeOffset; index++) {
			if (articleText[index] === "\n") {
				line++;
				column = 1;
				continue;
			}
			column++;
		}
		return { offset: safeOffset, line, column };
	};
	const match = articleText.match(
		/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/,
	);
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
					...atOffset(0),
				},
			],
		};
	}

	try {
		const parsed = parseYaml(match[1]);
		const parsedFrontmatter =
			typeof parsed === "object" && parsed !== null
				? (parsed as Record<string, unknown>)
				: {};
		const frontmatterValidation =
			ArticleFrontmatterSchema.safeParse(parsedFrontmatter);
		if (!frontmatterValidation.success) {
			const issueMessage =
				frontmatterValidation.error.issues[0]?.message ||
				"Frontmatter does not match required schema.";
			return {
				content: articleText.slice(match[0].length).trim(),
				frontmatter: parsedFrontmatter,
				diagnostics: [
					{
						code: "article-frontmatter-schema-invalid",
						severity: "error",
						source: "parser",
						message: `\`article.mda\` frontmatter schema is invalid: ${issueMessage}`,
						stage: "parse-article",
						...atOffset(0),
					},
				],
			};
		}
		return {
			content: articleText.slice(match[0].length).trim(),
			frontmatter: parsedFrontmatter,
			diagnostics: [],
		};
	} catch {
		return {
			content: articleText.slice(match[0].length).trim(),
			frontmatter: {},
			diagnostics: [
				{
					code: "article-frontmatter-invalid",
					severity: "error",
					source: "parser",
					message:
						"`article.mda` frontmatter YAML is invalid. Preview is blocked until fixed.",
					stage: "parse-article",
					...atOffset(0),
				},
			],
		};
	}
}

function detectUnsupportedSourceConcepts(
	content: string,
): PipelineDiagnostic[] {
	const diagnostics: PipelineDiagnostic[] = [];
	const hasFootnoteReference = /\[\^[^]]+\]/.test(content);
	const hasFootnoteDefinition = /^\[\^[^]]+\]:/m.test(content);
	const footnoteMatch =
		content.match(/\[\^[^]]+\]/) || content.match(/^\[\^[^]]+\]:/m);
	const location = (() => {
		const offset = footnoteMatch?.index ?? 0;
		let line = 1;
		let column = 1;
		for (let index = 0; index < offset; index++) {
			if (content[index] === "\n") {
				line++;
				column = 1;
				continue;
			}
			column++;
		}
		return { offset, line, column };
	})();
	if (hasFootnoteReference || hasFootnoteDefinition) {
		diagnostics.push({
			code: "article-footnote-unsupported",
			severity: "error",
			source: "parser",
			stage: "parse-article",
			message:
				"Footnotes are out of scope for v1 and must be removed from `article.mda`.",
			...location,
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
	runtimePluginIds: string[] | undefined,
): PipelineDiagnostic[] {
	const diagnostics: PipelineDiagnostic[] = [];
	const activePlugins = loadPluginRegistry(runtimePluginIds);

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
	runtimePluginIds: string[] | undefined,
): {
	diagnostics: PipelineDiagnostic[];
	activePluginIds: PipelineResult["activePluginIds"];
} {
	const executionState = resolvePluginExecutionState(runtimePluginIds);
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

import type { Root } from "mdast";
import { visit } from "unist-util-visit";

import { remarkNormalizeDirectives } from "@/lib/artichales.utils";

function executeParserHooks(
	articleContent: string,
	runtimePluginIds: string[] | undefined,
): { ast: Root | null; diagnostics: PipelineDiagnostic[] } {
	const diagnostics: PipelineDiagnostic[] = [];
	const executionState = resolvePluginExecutionState(runtimePluginIds);

	let processor = unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(remarkDirective)
		.use(remarkNormalizeDirectives);

	for (const plugin of executionState.parser) {
		const parseHook = plugin.hooks.parse;
		if (!parseHook) continue;

		processor = processor.use(function (this: Processor) {
			try {
				const transformer = parseHook.call(this) as
					| ((tree: Root, file: VFile) => void)
					| undefined;
				if (transformer) {
					return (tree: Root, file: VFile) => {
						try {
							transformer(tree, file);
						} catch (error) {
							const detail =
								error instanceof Error ? error.message : String(error);
							diagnostics.push({
								code: "plugin-hook-failed",
								severity: "error",
								source: "plugin",
								pluginId: plugin.id,
								stage: "plugin-processing",
								message: `Parser hook failed for "${plugin.id}": ${detail}`,
							});
						}
					};
				}
			} catch (error) {
				const detail = error instanceof Error ? error.message : String(error);
				diagnostics.push({
					code: "plugin-hook-failed",
					severity: "error",
					source: "plugin",
					pluginId: plugin.id,
					stage: "plugin-processing",
					message: `Parser hook setup failed for "${plugin.id}": ${detail}`,
				});
			}
		});
	}

	processor = processor.use(() => (tree: Root) => {
		visit(
			tree,
			[
				"heading",
				"paragraph",
				"containerDirective",
				"leafDirective",
				"textDirective",
				"list",
				"blockquote",
				"table",
			],
			(node) => {
				type MdastNodeWithData = typeof node & {
					data?: { hProperties?: Record<string, unknown> };
				};
				const dataNode = node as MdastNodeWithData;
				if (node.position?.start?.offset != null) {
					dataNode.data ??= {};
					dataNode.data.hProperties ??= {};
					dataNode.data.hProperties["data-source-offset"] =
						node.position.start.offset;
				}
			},
		);
	});

	let ast: Root | null = null;
	try {
		ast = processor.parse(articleContent);
		ast = processor.runSync(ast) as Root;
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		diagnostics.push({
			code: "plugin-hook-failed",
			severity: "error",
			source: "pipeline",
			stage: "plugin-processing",
			message: `Pipeline parsing failed: ${detail}`,
		});
	}

	return { ast, diagnostics };
}

function executeVoidHooks(
	plugins: Array<{
		id: string;
		hooks: { process?: () => void };
	}>,
	stage: "plugin-processing",
): PipelineDiagnostic[] {
	const diagnostics: PipelineDiagnostic[] = [];

	for (const plugin of plugins) {
		const hookFn = plugin.hooks.process;
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
				message: `Process hook failed for "${plugin.id}": ${detail}`,
			});
		}
	}

	return diagnostics;
}

function executeRenderHooks(
	plugins: Array<{
		id: string;
		hooks: {
			render?: (context: RenderHookContext) => unknown;
			directiveRender?: (context: RenderHookContext) => unknown;
		};
	}>,
	target: "web" | "print",
): PipelineDiagnostic[] {
	const diagnostics: PipelineDiagnostic[] = [];
	const context: RenderHookContext = {
		target,
		resolvedReferences: {},
		captions: {},
		utilityClasses: {},
	};

	for (const plugin of plugins) {
		try {
			plugin.hooks.render?.(context);
			plugin.hooks.directiveRender?.(context);
		} catch (error) {
			const detail = error instanceof Error ? error.message : String(error);
			diagnostics.push({
				code: "plugin-hook-failed",
				severity: "error",
				source: "plugin",
				pluginId: plugin.id,
				stage: "render-active-target",
				message: `Render hook failed for "${plugin.id}": ${detail}`,
			});
		}
	}

	return diagnostics;
}

function executePluginHooks(
	articleContent: string,
	runtimePluginIds: string[] | undefined,
): { ast: Root | null; diagnostics: PipelineDiagnostic[] } {
	const executionState = resolvePluginExecutionState(runtimePluginIds);
	const parserResult = executeParserHooks(articleContent, runtimePluginIds);
	return {
		ast: parserResult.ast,
		diagnostics: [
			...parserResult.diagnostics,
			...executeVoidHooks(executionState.core, "plugin-processing"),
		],
	};
}

function executeTargetRenderHooks(
	target: "web" | "print",
	runtimePluginIds: string[] | undefined,
): PipelineDiagnostic[] {
	const executionState = resolvePluginExecutionState(runtimePluginIds);
	return executeRenderHooks(executionState.render, target);
}

function emitPluginTrace(
	runtimePluginIds: string[] | undefined,
	pluginConfigDiagnostics: PipelineDiagnostic[],
): void {
	if (!import.meta.env.DEV) return;
	const activePlugins = loadPluginRegistry(runtimePluginIds).map((p) => p.id);
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

export function buildDocumentModel(
	files: Record<string, string>,
): DocumentModel {
	const stageDiagnostics: PipelineDiagnostic[] = [];
	const shouldEmitStageInfo = import.meta.env.DEV;
	const pushStage = (stage: PipelineStage) => {
		if (!shouldEmitStageInfo) return;
		stageDiagnostics.push({
			code: "pipeline-stage-complete",
			severity: "info",
			source: "pipeline",
			message: getStageInfoMessage(stage),
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
	const runtimePluginIds = resolveRuntimePluginIdsFromTemplate(
		templateResult.template.plugins,
	);

	const pluginMapResult = parsePluginConfigMap(articleResult.frontmatter);
	const pluginConfigDiagnostics = validatePluginConfigs(
		pluginMapResult.configMap,
		runtimePluginIds,
	);
	const pluginRuntimeResult =
		validatePluginRuntimeAvailability(runtimePluginIds);
	const pluginHooksResult = executePluginHooks(
		articleResult.content,
		runtimePluginIds,
	);
	emitPluginTrace(runtimePluginIds, [
		...pluginConfigDiagnostics,
		...pluginRuntimeResult.diagnostics,
		...pluginHooksResult.diagnostics,
	]);
	pushStage("plugin-processing");

	return {
		ast: pluginHooksResult.ast,
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
			...pluginHooksResult.diagnostics,
		],
		referenceTargets: articleAnalysis.referenceTargets,
		resolvedReferences: articleAnalysis.resolvedReferences,
		captions: articleAnalysis.captions,
		activePluginIds: pluginRuntimeResult.activePluginIds,
		runtimePluginIds,
		pipelineDiagnostics: stageDiagnostics,
	};
}

export function enrichDocumentModelForTarget(
	model: DocumentModel,
	target: "web" | "print",
): PipelineResult {
	const renderDiagnostics = executeTargetRenderHooks(
		target,
		model.runtimePluginIds,
	);
	const pipelineDiagnostics = [...model.pipelineDiagnostics];
	if (import.meta.env.DEV) {
		pipelineDiagnostics.push({
			code: "pipeline-stage-complete",
			severity: "info",
			source: "pipeline",
			message: getStageInfoMessage("render-active-target", target),
			stage: "render-active-target",
		});
	}

	return {
		ast: model.ast,
		content: model.content,
		frontmatter: model.frontmatter,
		citations: model.citations,
		validatedBibEntries: model.validatedBibEntries,
		plots: model.plots,
		template: model.template,
		templateDiagnostics: model.templateDiagnostics,
		bibDiagnostics: model.bibDiagnostics,
		assetDiagnostics: model.assetDiagnostics,
		articleDiagnostics: [...model.articleDiagnostics, ...renderDiagnostics],
		resolvedReferences: model.resolvedReferences,
		captions: model.captions,
		referenceTargets: model.referenceTargets,
		activePluginIds: model.activePluginIds,
		pipelineDiagnostics,
	};
}

export function runDocumentPipeline(
	files: Record<string, string>,
	target: "web" | "print",
): PipelineResult {
	const model = buildDocumentModel(files);
	return enrichDocumentModelForTarget(model, target);
}
