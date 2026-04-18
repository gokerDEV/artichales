import { buildPluginRegistryMaps } from "@/components/artichale/core/plugin.registry";
import { buildReferenceLookup } from "@/components/artichale/core/reference.lookup";
import { renderAuthors } from "@/components/artichale/render/author.render";
import { renderBibliography } from "@/components/artichale/render/bibliography.render";
import { renderDocument } from "@/components/artichale/render/document.render";
import { renderPage } from "@/components/artichale/render/page.render";
import { renderTitle } from "@/components/artichale/render/title.render";
import type {
	AssetResolver,
	JSONAssetReader,
	RenderArtichaleInput,
	RenderArtichaleResult,
} from "@/components/artichale/types/render.types";

const defaultJsonAssetReader: JSONAssetReader = async <T>() => ({
	data: {} as T,
	lastModified: "",
});

const defaultAssetResolver: AssetResolver = async (fileName) => ({
	fileName,
	resolvedSrc: "",
	mimeType: "",
	lastModified: "",
});

export async function renderArtichale(
	input: RenderArtichaleInput,
): Promise<RenderArtichaleResult> {
	// const plugins = resolveEnabledPluginsFromTemplate(input.template.plugins);
	const pluginRegistry = buildPluginRegistryMaps(input.plugins ?? []);
	const markdownLastModified = input.lastModified?.markdown ?? "";
	const templateLastModified = input.lastModified?.template ?? "";
	const bibliographyLastModified = input.lastModified?.bibliography ?? "";
	const fnJSONAssetReader = input.fnJSONAssetReader ?? defaultJsonAssetReader;
	const fnAssetResolver = input.fnAssetResolver ?? defaultAssetResolver;
	const titleLastModified = `${markdownLastModified}:${templateLastModified}`;
	const authorsLastModified = `${markdownLastModified}:${templateLastModified}`;
	const articleLastModified = `${markdownLastModified}:${templateLastModified}`;
	const pageLastModified = `${articleLastModified}:${input.target}`;
	const referencesLastModified = `${bibliographyLastModified}:${templateLastModified}`;

	const referenceLookup = buildReferenceLookup({
		template: input.template,
		headings: input.headings,
		labeledBlocks: input.labeledBlocks,
		pluginRegistry,
	});

	const title = renderTitle({
		frontmatter: input.frontmatter,
		template: input.template,
		lastModified: titleLastModified,
	});

	const authors = renderAuthors({
		frontmatter: input.frontmatter,
		template: input.template,
		lastModified: authorsLastModified,
	});

	const articleRendered = await renderDocument({
		ast: input.ast,
		target: input.target,
		lastModified: articleLastModified,
		template: input.template,
		pluginRegistry,
		resolvedReferences: referenceLookup.resolvedReferences,
		fnJSONAssetReader,
		fnAssetResolver,
	});

	const article = renderPage({
		target: input.target,
		children: articleRendered.article,
		lastModified: pageLastModified,
	});

	const references = renderBibliography({
		bibliography: input.bibliography,
		citations: input.citations,
		template: input.template,
		lastModified: referencesLastModified,
	});

	return {
		title,
		authors,
		article,
		references,
		diagnostics: articleRendered.diagnostics,
	};
}
