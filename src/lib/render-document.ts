import type { Root } from "mdast";
import type {
	HeadingEntry,
	LabeledBlockEntry,
} from "@/components/artichales/types/article.types";
import type {
	ParsedArticle,
	ParsedBibliography,
	ParsedTemplate,
	PipelineDiagnostic,
} from "@/components/artichales/types/pipeline.types";
import type { PluginRegistryMaps } from "@/components/artichales/types/plugin.types";
import type {
	ReferenceSelectorTarget,
	ResolvedCaption,
	ResolvedReference,
} from "@/components/artichales/types/reference.types";
import type { CitationEntry, ValidatedBibEntry } from "@/lib/bibtex";

export type {
	ReferenceSelectorTarget,
	ResolvedCaption,
	ResolvedReference,
} from "@/components/artichales/types/reference.types";

export type RenderDiagnostic = PipelineDiagnostic;

export type RenderInput = {
	template: ParsedTemplate;
	bibliography: ParsedBibliography;
	article: ParsedArticle;
	pluginRegistry: PluginRegistryMaps;
	target: "web" | "print";
};

export type RenderedReferenceEntry = {
	id: string;
	entry: CitationEntry;
};

export type RenderedDocument<ViewNode = unknown> = {
	body: ViewNode;
	references: readonly RenderedReferenceEntry[];
	diagnostics: readonly RenderDiagnostic[];
};

export type RenderReferenceLookup = {
	resolvedReferences: Record<string, ResolvedReference>;
	captions: Record<string, ResolvedCaption>;
	referenceTargets: ReferenceSelectorTarget[];
};

function normalizeLabelKey(raw: string): string {
	return raw
		.trim()
		.replace(/\.[^/.]+$/, "")
		.toLowerCase();
}

function toCitationEntry(entry: ValidatedBibEntry): CitationEntry {
	const author = "author" in entry ? entry.author : "Unknown";
	const year = "year" in entry ? entry.year : "????";
	const journal =
		entry.type === "article"
			? entry.journal
			: entry.type === "book"
				? entry.publisher
				: entry.type === "online"
					? entry.url
					: undefined;
	return {
		id: entry.key,
		type: entry.type,
		author,
		title: entry.title,
		year,
		journal,
	};
}

function resolveDisplayLabel(
	pluginId: string,
	pluginRegistry: PluginRegistryMaps,
	template: ParsedTemplate,
): string {
	const mapped = template.template.default.referenceLabels[pluginId];
	if (mapped && mapped.trim() !== "") return mapped.trim();
	const displayAs = pluginRegistry.displayAsByPluginId.get(pluginId);
	if (displayAs === "figure") return "Figure";
	if (displayAs === "table") return "Table";
	if (displayAs === "equation") return "Equation";
	if (displayAs === "code") return "Code";
	if (displayAs === "section") return "Section";
	if (displayAs === "abstract") return "Abstract";
	if (
		pluginId === "section" ||
		pluginId === "subsection" ||
		pluginId === "subsubsection"
	) {
		return "Section";
	}
	return pluginId.charAt(0).toUpperCase() + pluginId.slice(1);
}

function pushShortReference(
	shortIndex: Map<string, string[]>,
	selector: string,
): void {
	const [prefix] = selector.split(":");
	if (!prefix) return;
	const bucket = shortIndex.get(prefix) ?? [];
	bucket.push(selector);
	shortIndex.set(prefix, bucket);
}

function headingHref(heading: HeadingEntry): string {
	return `#${heading.id.replaceAll(":", "-")}`;
}

function captionHref(block: LabeledBlockEntry): string {
	return `#caption-${block.pluginId}-${normalizeLabelKey(block.label)}`;
}

export function buildRenderReferenceLookup(
	template: ParsedTemplate,
	article: ParsedArticle,
	pluginRegistry: PluginRegistryMaps,
): RenderReferenceLookup {
	const resolvedReferences: Record<string, ResolvedReference> = {};
	const captions: Record<string, ResolvedCaption> = {};
	const referenceTargets: ReferenceSelectorTarget[] = [];
	const shortIndex = new Map<string, string[]>();

	for (const heading of article.headings) {
		const selector = heading.id;
		const headingLabel = resolveDisplayLabel(
			heading.pluginId,
			pluginRegistry,
			template,
		);
		resolvedReferences[selector] = {
			label: `${headingLabel} ${heading.number}`,
			href: headingHref(heading),
		};
		referenceTargets.push({ selector, mode: "full" });
		pushShortReference(shortIndex, selector);
	}

	for (const block of article.labeledBlocks) {
		const selector = block.id;
		const blockLabel = resolveDisplayLabel(
			block.pluginId,
			pluginRegistry,
			template,
		);
		resolvedReferences[selector] = {
			label: `${blockLabel} ${block.number}`,
			href: captionHref(block),
		};
		captions[selector] = {
			label: `${blockLabel} ${block.number}`,
			href: captionHref(block),
		};
		referenceTargets.push({ selector, mode: "full" });
		pushShortReference(shortIndex, selector);
	}

	for (const [shortSelector, fullSelectors] of shortIndex.entries()) {
		if (fullSelectors.length !== 1) continue;
		const fullSelector = fullSelectors[0];
		const resolved = resolvedReferences[fullSelector];
		if (!resolved) continue;
		resolvedReferences[shortSelector] = resolved;
		referenceTargets.push({ selector: shortSelector, mode: "partial" });
	}

	referenceTargets.sort((a, b) => a.selector.localeCompare(b.selector));
	return { resolvedReferences, captions, referenceTargets };
}

function buildRenderedReferences(
	article: ParsedArticle,
	bibliography: ParsedBibliography,
): RenderedReferenceEntry[] {
	const ordered: RenderedReferenceEntry[] = [];
	for (const citationId of article.citations) {
		const entry = bibliography.entriesById[citationId];
		if (!entry) continue;
		ordered.push({ id: citationId, entry: toCitationEntry(entry) });
	}
	return ordered;
}

export function renderDocument(
	input: RenderInput,
): RenderedDocument<Root | null> {
	return {
		body: input.article.ast,
		references: buildRenderedReferences(input.article, input.bibliography),
		diagnostics: [],
	};
}
