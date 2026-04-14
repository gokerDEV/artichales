import type { Root } from "mdast";
import remarkDirective from "remark-directive";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { createParseDiagnostic } from "@/components/artichale/core/diagnostic";
import { collectArtifacts } from "@/components/artichale/core/artifacts.collector.ts";
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

export function parseDocument(
	rawMarkdown: string,
	pluginRegistry: PluginRegistryMaps,
): ParseDocumentResult {
	try {
		const processor = unified().use(remarkParse).use(remarkDirective);
		const ast = processor.parse(rawMarkdown) as Root;
		const artifacts = collectArtifacts(ast, pluginRegistry);
		return {
			ast,
			headings: artifacts.headings,
			labeledBlocks: artifacts.labeledBlocks,
			citations: artifacts.citations,
			diagnostics: artifacts.diagnostics,
		};
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		return {
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
}
