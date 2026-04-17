import type { Root } from "mdast";
import remarkDirective from "remark-directive";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { collectArtifacts } from "@/components/artichale/core/artifacts.collector.ts";
import { createParseDiagnostic } from "@/components/artichale/core/diagnostic";
import { createLastModifiedCache } from "@/components/artichale/core/last-modified.cache.ts";
import type {
	HeadingEntry,
	LabeledBlockEntry,
} from "@/components/artichale/types/article.types";
import type { ParseDiagnostic } from "@/components/artichale/types/pipeline.types";
import type { PluginRegistryMaps } from "@/components/artichale/types/plugin.types";

export type ParseDocumentResult = {
	ast: Root | null;
	headings: HeadingEntry[];
	labeledBlocks: LabeledBlockEntry[];
	citations: string[];
	diagnostics: ParseDiagnostic[];
};

const documentCache = createLastModifiedCache<ParseDocumentResult>();

export function parseDocument(
	rawMarkdown: string,
	pluginRegistry: PluginRegistryMaps,
	lastModified: string,
): ParseDocumentResult {
	const cached = documentCache.get(lastModified);
	if (cached) return cached;

	let result: ParseDocumentResult;

	try {
		const processor = unified().use(remarkParse).use(remarkDirective);
		const ast = processor.parse(rawMarkdown) as Root;
		const artifacts = collectArtifacts(ast, pluginRegistry);
		result = {
			ast,
			headings: artifacts.headings,
			labeledBlocks: artifacts.labeledBlocks,
			citations: artifacts.citations,
			diagnostics: artifacts.diagnostics,
		};
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		result = {
			ast: null,
			headings: [],
			labeledBlocks: [],
			citations: [],
			diagnostics: [
				createParseDiagnostic({
					code: "document-parse-failed",
					severity: "error",
					message: `Document parsing failed: ${detail}`,
				}),
			],
		};
	}

	documentCache.set(lastModified, result);
	return result;
}
