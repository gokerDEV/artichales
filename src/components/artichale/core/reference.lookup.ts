import type {
	HeadingEntry,
	LabeledBlockEntry,
} from "@/components/artichale/types/article.types";
import type { PluginRegistryMaps } from "@/components/artichale/types/plugin.types";
import type {
	ReferenceSelectorTarget,
	ResolvedCaption,
	ResolvedReference,
} from "@/components/artichale/types/reference.types";
import type { TemplateResolved } from "@/components/artichale/types/template.types";

const DISPLAY_LABEL_BY_FAMILY = {
	section: "Section",
	subsection: "Subsection",
	subsubsection: "Subsubsection",
	figure: "Figure",
	table: "Table",
	equation: "Equation",
	code: "Code",
	abstract: "Abstract",
	ref: "Reference",
	cite: "Citation",
	link: "Link",
} as const;

function headingHref(heading: HeadingEntry): string {
	return `#${heading.id.replaceAll(":", "-")}`;
}

function labeledBlockHref(block: LabeledBlockEntry): string {
	return `#${block.id.replaceAll(":", "-")}`;
}

function resolveDisplayLabel(
	pluginId: string,
	pluginRegistry: PluginRegistryMaps,
	template: TemplateResolved,
): string {
	const templateLabel = template.default.referenceLabels[pluginId];
	if (templateLabel && templateLabel.trim() !== "") return templateLabel.trim();

	const displayAs = pluginRegistry.displayAsByPluginId.get(pluginId);
	if (displayAs) return DISPLAY_LABEL_BY_FAMILY[displayAs];

	return pluginId.charAt(0).toUpperCase() + pluginId.slice(1);
}

function pushShortReferenceAlias(
	shortIndex: Map<string, string[]>,
	selector: string,
): void {
	const [prefix] = selector.split(":");
	if (!prefix) return;
	const selectors = shortIndex.get(prefix) ?? [];
	selectors.push(selector);
	shortIndex.set(prefix, selectors);
}

function buildHeadingReference(
	heading: HeadingEntry,
	template: TemplateResolved,
	pluginRegistry: PluginRegistryMaps,
): ResolvedReference {
	const displayLabel = resolveDisplayLabel(
		heading.pluginId,
		pluginRegistry,
		template,
	);
	return {
		label: `${displayLabel} ${heading.number}`,
		href: headingHref(heading),
	};
}

function buildLabeledBlockReference(
	block: LabeledBlockEntry,
	template: TemplateResolved,
	pluginRegistry: PluginRegistryMaps,
): ResolvedReference {
	const displayLabel = resolveDisplayLabel(
		block.pluginId,
		pluginRegistry,
		template,
	);
	return {
		label: `${displayLabel} ${block.number}`,
		href: labeledBlockHref(block),
	};
}

export type RenderReferenceLookup = {
	resolvedReferences: Record<string, ResolvedReference>;
	captions: Record<string, ResolvedCaption>;
	referenceTargets: ReferenceSelectorTarget[];
};

export function buildReferenceLookup(input: {
	template: TemplateResolved;
	headings: readonly HeadingEntry[];
	labeledBlocks: readonly LabeledBlockEntry[];
	pluginRegistry: PluginRegistryMaps;
}): RenderReferenceLookup {
	const resolvedReferences: Record<string, ResolvedReference> = {};
	const captions: Record<string, ResolvedCaption> = {};
	const referenceTargets: ReferenceSelectorTarget[] = [];
	const shortIndex = new Map<string, string[]>();

	for (const heading of input.headings) {
		const selector = heading.id;
		const resolved = buildHeadingReference(
			heading,
			input.template,
			input.pluginRegistry,
		);
		resolvedReferences[selector] = resolved;
		referenceTargets.push({ selector, mode: "full" });
		pushShortReferenceAlias(shortIndex, selector);
	}

	for (const block of input.labeledBlocks) {
		const selector = block.id;
		const resolved = buildLabeledBlockReference(
			block,
			input.template,
			input.pluginRegistry,
		);
		resolvedReferences[selector] = resolved;
		captions[selector] = resolved;
		referenceTargets.push({ selector, mode: "full" });
		pushShortReferenceAlias(shortIndex, selector);
	}

	for (const [shortSelector, fullSelectors] of shortIndex.entries()) {
		if (fullSelectors.length !== 1) continue;
		const [fullSelector] = fullSelectors;
		const resolved = resolvedReferences[fullSelector];
		if (!resolved) continue;
		resolvedReferences[shortSelector] = resolved;
		referenceTargets.push({ selector: shortSelector, mode: "partial" });
	}

	referenceTargets.sort((left, right) =>
		left.selector.localeCompare(right.selector),
	);

	return {
		resolvedReferences,
		captions,
		referenceTargets,
	};
}
