import * as React from "react";
import { parse as parseYaml } from "yaml";
import type { PreviewTarget } from "@/components/artichales/panels/preview-header";
// Statically imported MVP templates
import classicPrintTemplate from "@/components/artichales/templates/classic_print.json";
import classicWebTemplate from "@/components/artichales/templates/classic_web.json";
import type { CitationEntry } from "@/lib/bibtex";
import { parseBibtex } from "@/lib/bibtex";

export interface DocumentSource {
	content: string;
	frontmatter: Record<string, unknown>;
	citations: Record<string, CitationEntry>;
	// biome-ignore lint/suspicious/noExplicitAny: Template definitions are extremely dynamic
	template: any;
	citationStyle: string;
}

export function useDocument(
	files: Record<string, string>,
	activeFile: string,
	target: PreviewTarget,
): DocumentSource {
	const parsed = React.useMemo(() => {
		const text = files[activeFile] || "";
		// Naive frontmatter splitting
		const match = text.match(/^---\n([\s\S]*?)\n---/);
		if (!match) return { content: text, data: {} };

		try {
			const data = parseYaml(match[1]);
			const content = text.slice(match[0].length).trim();
			return {
				content,
				data:
					typeof data === "object" && data !== null
						? (data as Record<string, unknown>)
						: {},
			};
		} catch (e) {
			console.error("YAML Parse Error:", e);
			return { content: text, data: {} };
		}
	}, [files, activeFile]);

	const citations = React.useMemo(() => {
		return parseBibtex(files["references.bib"] || "");
	}, [files]);

	const templateName =
		typeof parsed.data.template === "string" ? parsed.data.template : "classic";

	const activeTemplate = React.useMemo(() => {
		// Static template fallback
		if (templateName === "classic") {
			return target === "web" ? classicWebTemplate : classicPrintTemplate;
		}
		return target === "web" ? classicWebTemplate : classicPrintTemplate;
	}, [templateName, target]);

	const citationStyle = React.useMemo(() => {
		const refs = parsed.data.references;
		let overrideStyle: string | undefined;

		if (Array.isArray(refs)) {
			const styleObj = refs.find(
				(r) => r && typeof r === "object" && "style" in r,
			);
			overrideStyle = styleObj ? String(styleObj.style) : undefined;
		} else if (refs && typeof refs === "object" && "style" in refs) {
			overrideStyle = String((refs as { style: unknown }).style);
		}

		return overrideStyle || activeTemplate?.citations?.style || "author-year";
	}, [parsed.data.references, activeTemplate?.citations?.style]);

	return {
		content: parsed.content,
		frontmatter: parsed.data,
		citations,
		template: activeTemplate,
		citationStyle,
	};
}
