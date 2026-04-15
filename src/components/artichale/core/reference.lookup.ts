import type {
	HeadingEntry,
	LabeledBlockEntry,
} from "@/components/artichale/types/article.types";
import type { PluginRegistryMaps } from "@/components/artichale/types/plugin.types";
import type {
	ResolvedCaption,
	ResolvedReference,
} from "@/components/artichale/types/reference.types";
import type { TemplateResolved } from "@/components/artichale/types/template.types";

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
	const pluginLabel = template.default.referenceLabels[pluginId];
	if (pluginLabel && pluginLabel.trim() !== "") return pluginLabel.trim();

	const displayAs = pluginRegistry.displayAsByPluginId.get(pluginId);
	if (displayAs) {
		const familyLabel = template.default.referenceLabels[displayAs];
		if (familyLabel && familyLabel.trim() !== "") return familyLabel.trim();
	}

	return pluginId.charAt(0).toUpperCase() + pluginId.slice(1);
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
	resolvedReferences: ReadonlyMap<string, ResolvedReference>;
	captions: Record<string, ResolvedCaption>;
};

export function buildReferenceLookup(input: {
	template: TemplateResolved;
	headings: readonly HeadingEntry[];
	labeledBlocks: readonly LabeledBlockEntry[];
	pluginRegistry: PluginRegistryMaps;
}): RenderReferenceLookup {
	const resolvedReferences = new Map<string, ResolvedReference>();
	const captions: Record<string, ResolvedCaption> = {};

	for (const heading of input.headings) {
		const selector = heading.id;
		const resolved = buildHeadingReference(
			heading,
			input.template,
			input.pluginRegistry,
		);
		resolvedReferences.set(selector, resolved);
	}

	for (const block of input.labeledBlocks) {
		const selector = block.id;
		const resolved = buildLabeledBlockReference(
			block,
			input.template,
			input.pluginRegistry,
		);
		resolvedReferences.set(selector, resolved);
		captions[selector] = resolved;
	}

	return {
		resolvedReferences,
		captions,
	};
}
