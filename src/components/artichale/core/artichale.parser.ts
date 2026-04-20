import {
	buildPluginRegistryMaps,
	resolveEnabledPluginsFromTemplate,
} from "@/components/artichale/core/plugin.registry";
import { parseBibliography } from "@/components/artichale/parser/bibliography.parser";
import { parseDocument } from "@/components/artichale/parser/document.parser";
import { parseFrontmatter } from "@/components/artichale/parser/frontmatter.parser";
import { parseTemplate } from "@/components/artichale/parser/template.parser";
import type {
	ParseArtichaleInput,
	ParseArtichaleResult,
} from "@/components/artichale/types/pipeline.types";

const FRONTMATTER_BLOCK_PATTERN =
	/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

function splitFrontmatter(rawMarkdown: string): {
	rawFrontmatter?: string;
	content: string;
} {
	const match = rawMarkdown?.match(FRONTMATTER_BLOCK_PATTERN);
	if (!match) {
		return { content: rawMarkdown };
	}

	return {
		rawFrontmatter: match[1],
		content: rawMarkdown.slice(match[0].length),
	};
}

export function parseArtichale({
	template,
	bibliography,
	markdown,
}: ParseArtichaleInput): ParseArtichaleResult {
	const templateResult = parseTemplate(template);
	const plugins = resolveEnabledPluginsFromTemplate(
		templateResult.template.plugins,
		// template?.lastModified || "",
	);
	const pluginRegistry = buildPluginRegistryMaps(plugins);
	const bibliographyResult = parseBibliography(bibliography);

	const split = splitFrontmatter(markdown.data);
	const frontmatterResult = parseFrontmatter(
		split.rawFrontmatter || "",
		markdown.lastModified,
	);
	const documentResult = parseDocument(
		split.content,
		pluginRegistry,
		markdown.lastModified,
	);

	return {
		template: templateResult.template,
		bibliography: bibliographyResult.bibliography,
		frontmatter: frontmatterResult.frontmatter,
		ast: documentResult.ast,
		headings: documentResult.headings,
		labeledBlocks: documentResult.labeledBlocks,
		citations: documentResult.citations,
		plugins,
		diagnostics: [
			...frontmatterResult.diagnostics,
			...documentResult.diagnostics,
			...bibliographyResult.diagnostics,
		],
	};
}
