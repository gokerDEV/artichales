import { collectArtifacts } from "@/components/artichale/core/artifacts.collector";
import {
	buildPluginRegistryMaps,
	resolvePlugins,
} from "@/components/artichale/core/plugin.registry";
import { buildReferenceLookup } from "@/components/artichale/core/reference.lookup";
import { renderAuthors } from "@/components/artichale/render/author.render";
import { renderBibliography } from "@/components/artichale/render/bibliography.render";
import { renderDocument } from "@/components/artichale/render/document.render";
import { renderPage } from "@/components/artichale/render/page.render";
import { renderTitle } from "@/components/artichale/render/title.render";
import type {
	RenderArtichaleInput,
	RenderArtichaleResult,
} from "@/components/artichale/types/render.types";

export async function renderArtichale(
	input: RenderArtichaleInput,
): Promise<RenderArtichaleResult> {
	const plugins = resolvePlugins(input.template.plugins);
	const pluginRegistry = buildPluginRegistryMaps(plugins);

	const artifacts = collectArtifacts(input.ast, pluginRegistry);
	const referenceLookup = buildReferenceLookup({
		template: input.template,
		headings: artifacts.headings,
		labeledBlocks: artifacts.labeledBlocks,
		pluginRegistry,
	});

	const title = renderTitle({
		frontmatter: input.frontmatter,
		template: input.template,
	});

	const authors = renderAuthors({
		frontmatter: input.frontmatter,
		template: input.template,
	});

	const articleRendered = await renderDocument({
		ast: input.ast,
		target: input.target,
		template: input.template,
		pluginRegistry,
		resolvedReferences: referenceLookup.resolvedReferences,
		fnJSONAssetReader: input.fnJSONAssetReader,
		fnAsssetResolver: input.fnAsssetResolver,
	});

	const article = renderPage({
		target: input.target,
		children: articleRendered.article,
	});

	const references = renderBibliography({
		bibliography: input.bibliography,
		citations: input.citations,
		template: input.template,
	});

	return {
		title,
		authors,
		article,
		references,
		diagnostics: articleRendered.diagnostics,
	};
}
