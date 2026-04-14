import type { Root } from "mdast";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { createParseDiagnostic } from "@/components/artichale/core/diagnostic";
import type { ParseDiagnostic } from "@/components/artichale/types/pipeline.types";

export type ParseDocumentResult = {
	ast: Root | null;
	diagnostics: ParseDiagnostic[];
};

export function parseDocument(rawMarkdown: string): ParseDocumentResult {
	try {
		const processor = unified()
			.use(remarkParse)
			.use(remarkGfm)
			.use(remarkDirective);
		const ast = processor.parse(rawMarkdown) as Root;
		return {
			ast,
			diagnostics: [],
		};
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		return {
			ast: null,
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
