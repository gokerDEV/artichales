import { parse as parseYaml } from "yaml";
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
		| "article-frontmatter-invalid"
		| "asset-json-invalid";
	severity: "error" | "warning" | "info";
	source: "pipeline" | "parser";
	message: string;
	stage?: PipelineStage;
	fileName?: string;
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
			diagnostics: [],
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

	const articleAnalysis = analyzeArticleSource(articleResult.content);
	pushStage("build-registry-and-numbering");

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
			...articleAnalysis.diagnostics,
		],
		resolvedReferences: articleAnalysis.resolvedReferences,
		pipelineDiagnostics: stageDiagnostics,
	};
}
