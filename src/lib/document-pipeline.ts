import type { Root } from "mdast";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import type { Processor } from "unified";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import type {
	DirectiveKind,
	DisplayAs,
	PluginDefinition,
} from "@/components/artichales/plugins/plugin.contract";
import {
	loadPluginRegistry,
	resolveRuntimePluginIdsFromTemplate,
} from "@/components/artichales/plugins/plugin.registry";
import { resolvePluginExecutionState } from "@/components/artichales/plugins/plugin.runtime";
import type {
	HeadingEntry,
	LabeledBlockEntry,
} from "@/components/artichales/types/article.types";
import type { ArticleFrontmatter } from "@/components/artichales/types/frontmatter.types";
import type {
	ParsedArticle,
	ParsedBibliography,
	ParsedTemplate,
	PipelineDiagnostic,
	PipelineExecutionResult,
	PipelineStage,
} from "@/components/artichales/types/pipeline.types";
import type {
	PluginMetadata,
	PluginRegistryMaps,
} from "@/components/artichales/types/plugin.types";
import {
	normalizeExtendedDirectiveSyntax,
	remarkNormalizeDirectives,
} from "@/lib/artichales.utils";
import { parseBibtexDocument } from "@/lib/bibtex";
import { resolveTemplateFile } from "@/lib/template";
import {
	CORE_ARTICLE_FILE,
	CORE_BIB_FILE,
	CORE_TEMPLATE_FILE,
} from "@/lib/workspace";

export type {
	HeadingEntry,
	LabeledBlockEntry,
} from "@/components/artichales/types/article.types";
export type {
	ArticleFrontmatter,
	FrontmatterAuthor,
	FrontmatterConference,
	FrontmatterJournal,
	FrontmatterLicense,
} from "@/components/artichales/types/frontmatter.types";
export type {
	AppDiagnostic,
	ParsedArticle,
	ParsedBibliography,
	ParsedTemplate,
	PipelineDiagnostic,
	PipelineExecutionResult,
	PipelineResultPayload,
	PipelineStage,
} from "@/components/artichales/types/pipeline.types";
export type {
	PluginMetadata,
	PluginRegistryMaps,
} from "@/components/artichales/types/plugin.types";

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
	.strict();

const FrontmatterLicenseSchema = z
	.object({
		name: FrontmatterOptionalString,
		text: FrontmatterOptionalString,
		url: FrontmatterOptionalString,
	})
	.strict();

const FrontmatterJournalSchema = z
	.object({
		name: FrontmatterOptionalString,
		issn: FrontmatterOptionalString,
		eissn: FrontmatterOptionalString,
		volume: z.union([z.string(), z.number(), z.null()]).optional(),
		issue: z.union([z.string(), z.number(), z.null()]).optional(),
		pages: FrontmatterOptionalString,
	})
	.strict();

const FrontmatterConferenceSchema = z
	.object({
		name: FrontmatterOptionalString,
		location: FrontmatterOptionalString,
		date: FrontmatterOptionalString,
		proceedings: FrontmatterOptionalString,
		pages: FrontmatterOptionalString,
	})
	.strict();

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
	})
	.strict();

function getStageInfoMessage(stage: PipelineStage): string {
	const labels: Record<PipelineStage, string> = {
		"validate-template": "Template validation stage completed.",
		"validate-bibliography": "Bibliography validation stage completed.",
		"parse-article": "Article parsing stage completed.",
		"build-registry-and-numbering": "Registry and numbering stage completed.",
	};
	return labels[stage];
}

function atOffset(content: string, offset: number) {
	const safeOffset = Math.max(0, Math.min(offset, content.length));
	let line = 1;
	let column = 1;
	for (let index = 0; index < safeOffset; index++) {
		if (content[index] === "\n") {
			line++;
			column = 1;
			continue;
		}
		column++;
	}
	return { offset: safeOffset, line, column };
}

function parseArticleFrontmatter(articleText: string): {
	content: string;
	frontmatter: ArticleFrontmatter;
	diagnostics: PipelineDiagnostic[];
} {
	const emptyFrontmatter: ArticleFrontmatter = {
		title: "Untitled",
	};
	const match = articleText.match(
		/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/,
	);
	if (!match) {
		return {
			content: articleText,
			frontmatter: emptyFrontmatter,
			diagnostics: [
				{
					code: "article-frontmatter-missing",
					severity: "error",
					source: "parser",
					message:
						"`article.mda` frontmatter is required. Preview is blocked until it is added.",
					stage: "parse-article",
					...atOffset(articleText, 0),
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
		const validation = ArticleFrontmatterSchema.safeParse(parsedFrontmatter);
		if (!validation.success) {
			const issueMessage =
				validation.error.issues[0]?.message ||
				"Frontmatter does not match required schema.";
			return {
				content: articleText.slice(match[0].length).trim(),
				frontmatter: emptyFrontmatter,
				diagnostics: [
					{
						code: "article-frontmatter-schema-invalid",
						severity: "error",
						source: "parser",
						message: `\`article.mda\` frontmatter schema is invalid: ${issueMessage}`,
						stage: "parse-article",
						...atOffset(articleText, 0),
					},
				],
			};
		}

		const normalizedAuthors = (() => {
			const { authors } = validation.data;
			if (!authors) return undefined;
			if (typeof authors === "string") return [{ name: authors }] as const;
			return authors.map((author) =>
				typeof author === "string" ? { name: author } : author,
			);
		})();

		return {
			content: articleText.slice(match[0].length).trim(),
			frontmatter: {
				...validation.data,
				authors: normalizedAuthors,
			},
			diagnostics: [],
		};
	} catch {
		return {
			content: articleText.slice(match[0].length).trim(),
			frontmatter: emptyFrontmatter,
			diagnostics: [
				{
					code: "article-frontmatter-invalid",
					severity: "error",
					source: "parser",
					message:
						"`article.mda` frontmatter YAML is invalid. Preview is blocked until fixed.",
					stage: "parse-article",
					...atOffset(articleText, 0),
				},
			],
		};
	}
}

function detectUnsupportedSourceConcepts(
	content: string,
): PipelineDiagnostic[] {
	const diagnostics: PipelineDiagnostic[] = [];
	const hasFootnoteReference = /\[\^[^\]]+]/.test(content);
	const hasFootnoteDefinition = /^\[\^[^\]]+]:/m.test(content);
	const footnoteMatch =
		content.match(/\[\^[^\]]+]/) || content.match(/^\[\^[^\]]+]:/m);
	if (hasFootnoteReference || hasFootnoteDefinition) {
		diagnostics.push({
			code: "article-footnote-unsupported",
			severity: "error",
			source: "parser",
			stage: "parse-article",
			message:
				"Footnotes are out of scope for v1 and must be removed from `article.mda`.",
			...atOffset(content, footnoteMatch?.index ?? 0),
		});
	}
	return diagnostics;
}

function executeParserHooks(
	articleContent: string,
	runtimePluginIds: string[],
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
				if (!transformer) return;
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
							stage: "parse-article",
							message: `Parser hook failed for "${plugin.id}": ${detail}`,
						});
					}
				};
			} catch (error) {
				const detail = error instanceof Error ? error.message : String(error);
				diagnostics.push({
					code: "plugin-hook-failed",
					severity: "error",
					source: "plugin",
					pluginId: plugin.id,
					stage: "parse-article",
					message: `Parser hook setup failed for "${plugin.id}": ${detail}`,
				});
			}
		});
	}

	const normalizedArticleContent =
		normalizeExtendedDirectiveSyntax(articleContent);
	try {
		let ast = processor.parse(normalizedArticleContent);
		ast = processor.runSync(ast) as Root;
		return { ast, diagnostics };
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		return {
			ast: null,
			diagnostics: [
				...diagnostics,
				{
					code: "plugin-hook-failed",
					severity: "error",
					source: "pipeline",
					stage: "parse-article",
					message: `Pipeline parsing failed: ${detail}`,
				},
			],
		};
	}
}

function extractNodeText(node: unknown): string {
	if (!node || typeof node !== "object") return "";
	const record = node as Record<string, unknown>;
	const ownValue = typeof record.value === "string" ? record.value : "";
	const children = Array.isArray(record.children) ? record.children : [];
	return [ownValue, ...children.map((child) => extractNodeText(child))]
		.join("")
		.trim();
}

function normalizeLabelKey(raw: string): string {
	return raw
		.trim()
		.replace(/\.[^/.]+$/, "")
		.toLowerCase();
}

function extractDirectiveDataFile(node: Record<string, unknown>): string {
	const data = node.data;
	if (data && typeof data === "object") {
		const hProperties = (data as Record<string, unknown>).hProperties;
		if (hProperties && typeof hProperties === "object") {
			const value = (hProperties as Record<string, unknown>)[
				"data-directive-data-file"
			];
			if (typeof value === "string" && value.trim() !== "") return value.trim();
		}
	}
	const attributes = node.attributes;
	if (attributes && typeof attributes === "object") {
		const dataFile =
			(attributes as Record<string, unknown>).data_file ??
			(attributes as Record<string, unknown>).datafile;
		if (typeof dataFile === "string" && dataFile.trim() !== "") {
			return dataFile.trim();
		}
	}
	return "";
}

function fallbackDisplayAsByPluginId(pluginId: string): DisplayAs | undefined {
	if (pluginId === "plotty" || pluginId === "figure") return "figure";
	if (pluginId === "datatable" || pluginId === "table") return "table";
	if (pluginId === "equation") return "equation";
	if (pluginId === "codesample" || pluginId === "code") return "code";
	if (pluginId === "abstract") return "abstract";
	return undefined;
}

function sourceLocation(node: Record<string, unknown>) {
	const position = node.position;
	if (!position || typeof position !== "object") return {};
	const start = (position as Record<string, unknown>).start;
	if (!start || typeof start !== "object") return {};
	const startRecord = start as Record<string, unknown>;
	const offset =
		typeof startRecord.offset === "number" ? startRecord.offset : undefined;
	const line =
		typeof startRecord.line === "number" ? startRecord.line : undefined;
	const column =
		typeof startRecord.column === "number" ? startRecord.column : undefined;
	return { offset, line, column };
}

function collectArticleArtifacts(
	ast: Root | null,
	pluginRegistry: PluginRegistryMaps,
): {
	headings: HeadingEntry[];
	labeledBlocks: LabeledBlockEntry[];
	citations: string[];
	diagnostics: PipelineDiagnostic[];
} {
	if (!ast) {
		return { headings: [], labeledBlocks: [], citations: [], diagnostics: [] };
	}

	const diagnostics: PipelineDiagnostic[] = [];
	const headings: HeadingEntry[] = [];
	const labeledBlocks: LabeledBlockEntry[] = [];
	const citations: string[] = [];
	const seenCitationIds = new Set<string>();
	const seenHeadingIds = new Set<string>();
	const seenBlockIds = new Set<string>();
	const blockCounterByFamily = new Map<string, number>();

	let sectionNumber = 0;
	let subsectionNumber = 0;
	let subsubsectionNumber = 0;
	let currentSectionId: string | undefined;
	let currentSubsectionId: string | undefined;

	const pushCitation = (id: string) => {
		const normalized = id.trim();
		if (!normalized || seenCitationIds.has(normalized)) return;
		seenCitationIds.add(normalized);
		citations.push(normalized);
	};

	visit(ast, (rawNode: unknown) => {
		if (!rawNode || typeof rawNode !== "object") return;
		const node = rawNode as Record<string, unknown>;

		if (node.type === "cite") {
			const data = node.data as Record<string, unknown> | undefined;
			const props = data?.hProperties as Record<string, unknown> | undefined;
			const rawIds = props?.["data-cite-id"] ?? props?.["data-cite-ids"];
			if (typeof rawIds === "string") {
				for (const token of rawIds.split(",")) {
					pushCitation(token);
				}
			}
			return;
		}

		const nodeType = typeof node.type === "string" ? node.type : "";
		if (nodeType !== "containerDirective" && nodeType !== "leafDirective")
			return;

		const pluginId =
			typeof node.name === "string" ? node.name.trim().toLowerCase() : "";
		if (!pluginId) return;
		const rawLabel = extractDirectiveDataFile(node);
		const normalizedLabel = normalizeLabelKey(rawLabel);
		const location = sourceLocation(node);

		if (
			pluginId === "section" ||
			pluginId === "subsection" ||
			pluginId === "subsubsection"
		) {
			if (!normalizedLabel) return;
			const title = extractNodeText(node) || rawLabel || pluginId;
			const id = `${pluginId}:${normalizedLabel}`;
			if (seenHeadingIds.has(id)) {
				diagnostics.push({
					code: "article-heading-duplicate-label",
					severity: "error",
					source: "parser",
					stage: "build-registry-and-numbering",
					message: `Duplicate heading label detected for "${id}".`,
					...location,
				});
				return;
			}
			seenHeadingIds.add(id);

			if (pluginId === "section") {
				sectionNumber += 1;
				subsectionNumber = 0;
				subsubsectionNumber = 0;
				currentSectionId = id;
				currentSubsectionId = undefined;
				headings.push({
					id,
					pluginId,
					label: rawLabel,
					title,
					level: 1,
					number: `${sectionNumber}`,
				});
				return;
			}

			if (pluginId === "subsection") {
				if (!currentSectionId) {
					diagnostics.push({
						code: "article-heading-parent-missing",
						severity: "error",
						source: "parser",
						stage: "build-registry-and-numbering",
						message: `Subsection "${id}" is missing a parent section.`,
						...location,
					});
					return;
				}
				subsectionNumber += 1;
				subsubsectionNumber = 0;
				currentSubsectionId = id;
				headings.push({
					id,
					pluginId,
					label: rawLabel,
					title,
					level: 2,
					number: `${sectionNumber}.${subsectionNumber}`,
					parentId: currentSectionId,
				});
				return;
			}

			if (!currentSubsectionId) {
				diagnostics.push({
					code: "article-heading-parent-missing",
					severity: "error",
					source: "parser",
					stage: "build-registry-and-numbering",
					message: `Subsubsection "${id}" is missing a parent subsection.`,
					...location,
				});
				return;
			}
			subsubsectionNumber += 1;
			headings.push({
				id,
				pluginId,
				label: rawLabel,
				title,
				level: 3,
				number: `${sectionNumber}.${subsectionNumber}.${subsubsectionNumber}`,
				parentId: currentSubsectionId,
			});
			return;
		}

		if (!normalizedLabel) return;
		const id = `${pluginId}:${normalizedLabel}`;
		if (seenBlockIds.has(id)) {
			diagnostics.push({
				code: "article-labeled-block-duplicate-label",
				severity: "error",
				source: "parser",
				stage: "build-registry-and-numbering",
				message: `Duplicate labeled block detected for "${id}".`,
				...location,
			});
			return;
		}
		seenBlockIds.add(id);

		const family =
			pluginRegistry.displayAsByPluginId.get(pluginId) ??
			fallbackDisplayAsByPluginId(pluginId) ??
			pluginId;
		const nextNumber = (blockCounterByFamily.get(family) ?? 0) + 1;
		blockCounterByFamily.set(family, nextNumber);
		labeledBlocks.push({
			id,
			pluginId,
			label: rawLabel,
			number: nextNumber,
		});
	});

	return { headings, labeledBlocks, citations, diagnostics };
}

function validatePluginRuntimeAvailability(runtimePluginIds: string[]): {
	diagnostics: PipelineDiagnostic[];
	activePluginIds: PipelineExecutionResult["activePluginIds"];
} {
	const executionState = resolvePluginExecutionState(runtimePluginIds);
	const diagnostics: PipelineDiagnostic[] = [];
	for (const parserPluginId of executionState.missingParserRuntimeIds) {
		diagnostics.push({
			code: "plugin-runtime-missing",
			severity: "error",
			source: "plugin",
			pluginId: parserPluginId,
			stage: "parse-article",
			message: `Parser runtime hook is missing for plugin "${parserPluginId}".`,
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

function pluginToMetadata(plugin: PluginDefinition): PluginMetadata {
	return {
		id: plugin.id,
		displayAs: plugin.displayAs,
		kind: plugin.kind,
		autocomplete: plugin.autocomplete,
	};
}

export function buildPluginRegistryMaps(
	runtimePluginIds: readonly string[],
): PluginRegistryMaps {
	const byId = new Map<string, PluginMetadata>();
	const displayAsByPluginId = new Map<string, DisplayAs>();
	const directiveKindByPluginId = new Map<string, DirectiveKind>();
	for (const plugin of loadPluginRegistry([...runtimePluginIds])) {
		const metadata = pluginToMetadata(plugin);
		byId.set(metadata.id, metadata);
		if (metadata.displayAs) {
			displayAsByPluginId.set(metadata.id, metadata.displayAs);
		}
		if (metadata.kind) {
			directiveKindByPluginId.set(metadata.id, metadata.kind);
		}
	}
	return { byId, displayAsByPluginId, directiveKindByPluginId };
}

export function parseTemplatePhase(
	files: Record<string, string>,
): ParsedTemplate {
	const templateResult = resolveTemplateFile(files[CORE_TEMPLATE_FILE]);
	return {
		template: templateResult.template,
		enabledPluginIds: resolveRuntimePluginIdsFromTemplate(
			templateResult.template.plugins,
		),
		diagnostics: templateResult.diagnostics,
	};
}

export function parseBibliographyPhase(
	files: Record<string, string>,
): ParsedBibliography {
	const bibResult = parseBibtexDocument(files[CORE_BIB_FILE] || "");
	return {
		entriesById: bibResult.validatedEntries,
		diagnostics: bibResult.diagnostics,
	};
}

export function parseArticlePhase(
	files: Record<string, string>,
	template: ParsedTemplate,
	pluginRegistry: PluginRegistryMaps,
): {
	article: ParsedArticle;
	activePluginIds: PipelineExecutionResult["activePluginIds"];
} {
	const articleText = files[CORE_ARTICLE_FILE] || "";
	const frontmatterResult = parseArticleFrontmatter(articleText);
	const unsupportedDiagnostics = detectUnsupportedSourceConcepts(
		frontmatterResult.content,
	);
	const runtimeValidation = validatePluginRuntimeAvailability([
		...template.enabledPluginIds,
	]);
	const parserResult = executeParserHooks(frontmatterResult.content, [
		...template.enabledPluginIds,
	]);
	const indexed = collectArticleArtifacts(parserResult.ast, pluginRegistry);

	return {
		article: {
			frontmatter: frontmatterResult.frontmatter,
			ast: parserResult.ast,
			headings: indexed.headings,
			labeledBlocks: indexed.labeledBlocks,
			citations: indexed.citations,
			diagnostics: [
				...frontmatterResult.diagnostics,
				...unsupportedDiagnostics,
				...runtimeValidation.diagnostics,
				...parserResult.diagnostics,
				...indexed.diagnostics,
			],
		},
		activePluginIds: runtimeValidation.activePluginIds,
	};
}

export function runDocumentPipeline(
	files: Record<string, string>,
	_target: "web" | "print" = "web",
): PipelineExecutionResult {
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

	const parsedTemplate = parseTemplatePhase(files);
	pushStage("validate-template");

	const parsedBibliography = parseBibliographyPhase(files);
	pushStage("validate-bibliography");

	const pluginRegistry = buildPluginRegistryMaps(
		parsedTemplate.enabledPluginIds,
	);
	const parsedArticleResult = parseArticlePhase(
		files,
		parsedTemplate,
		pluginRegistry,
	);
	pushStage("parse-article");
	pushStage("build-registry-and-numbering");

	return {
		template: parsedTemplate,
		bibliography: parsedBibliography,
		article: parsedArticleResult.article,
		pluginRegistry,
		activePluginIds: parsedArticleResult.activePluginIds,
		diagnostics: [
			...parsedTemplate.diagnostics,
			...parsedBibliography.diagnostics,
			...parsedArticleResult.article.diagnostics,
			...stageDiagnostics,
		],
	};
}

export function buildDocumentModel(
	files: Record<string, string>,
): PipelineExecutionResult {
	return runDocumentPipeline(files, "web");
}

export function enrichDocumentModelForTarget(
	model: PipelineExecutionResult,
	_target: "web" | "print",
): PipelineExecutionResult {
	return model;
}
