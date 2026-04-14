import type { Root } from "mdast";
import { visit } from "unist-util-visit";
import {
	collectNodeText,
	normalizeReferenceKey,
	parseDirectiveNode,
	sourcePosition,
	toDirectiveId,
} from "@/components/artichale/core/artichale.util";
import { createParseDiagnostic } from "@/components/artichale/core/diagnostic";
import type {
	HeadingEntry,
	LabeledBlockEntry,
} from "@/components/artichale/types/article.types";
import type { ParseDiagnostic } from "@/components/artichale/types/pipeline.types";
import {
	type DirectiveNode,
	DisplayAs,
	type PluginRegistryMaps,
} from "@/components/artichale/types/plugin.types";

const HEADING_LEVEL_BY_PLUGIN_ID = {
	section: 1,
	subsection: 2,
	subsubsection: 3,
} as const;

type HeadingPluginId = keyof typeof HEADING_LEVEL_BY_PLUGIN_ID;

export type CollectArtifactsResult = {
	headings: HeadingEntry[];
	labeledBlocks: LabeledBlockEntry[];
	citations: string[];
	diagnostics: ParseDiagnostic[];
};

function isDirectiveNode(node: unknown): node is DirectiveNode {
	if (!node || typeof node !== "object") return false;
	const record = node as Record<string, unknown>;
	return (
		(record.type === "textDirective" ||
			record.type === "leafDirective" ||
			record.type === "containerDirective") &&
		typeof record.name === "string"
	);
}

function isHeadingPluginId(pluginId: string): pluginId is HeadingPluginId {
	return pluginId in HEADING_LEVEL_BY_PLUGIN_ID;
}

function resolveFamily(
	pluginId: string,
	pluginRegistry: PluginRegistryMaps,
): string {
	return pluginRegistry.displayAsByPluginId.get(pluginId) ?? pluginId;
}

function extractCiteIdsFromDirective(node: DirectiveNode): string[] {
	const parsed = parseDirectiveNode(node);
	const raw = parsed.label || parsed.dataFile || collectNodeText(node);

	return raw
		.split(",")
		.map((token) => token.trim())
		.filter(Boolean);
}

export function collectArtifacts(
	ast: Root | null,
	pluginRegistry: PluginRegistryMaps,
): CollectArtifactsResult {
	if (!ast) {
		return {
			headings: [],
			labeledBlocks: [],
			citations: [],
			diagnostics: [],
		};
	}

	const diagnostics: ParseDiagnostic[] = [];
	const headings: HeadingEntry[] = [];
	const labeledBlocks: LabeledBlockEntry[] = [];
	const citations: string[] = [];

	const seenCitationIds = new Set<string>();
	const seenHeadingIds = new Set<string>();
	const seenLabeledBlockIds = new Set<string>();
	const blockCounterByFamily = new Map<string, number>();

	let sectionNumber = 0;
	let subsectionNumber = 0;
	let subsubsectionNumber = 0;
	let currentSectionId: string | undefined;
	let currentSubsectionId: string | undefined;

	const pushCitation = (id: string) => {
		const normalized = id.trim();
		if (!normalized || seenCitationIds.has(normalized)) return;
		seenCitationIds.add(normalized);
		citations.push(normalized);
	};

	visit(ast, (candidate) => {
		if (!isDirectiveNode(candidate)) return;

		const pluginId = candidate.name.trim().toLowerCase();
		if (!pluginId) return;

		if (pluginId === "cite") {
			for (const id of extractCiteIdsFromDirective(candidate)) {
				pushCitation(id);
			}
			return;
		}

		const parsed = parseDirectiveNode(candidate);
		const referenceInput = parsed.dataFile || parsed.label;
		const normalizedReference = normalizeReferenceKey(referenceInput);
		if (!normalizedReference) return;

		const location = sourcePosition(candidate);

		if (isHeadingPluginId(pluginId)) {
			const id = toDirectiveId(pluginId, normalizedReference);
			if (seenHeadingIds.has(id)) {
				diagnostics.push(
					createParseDiagnostic(
						{
							code: "article-heading-duplicate-label",
							severity: "error",
							message: `Duplicate heading label detected for "${id}".`,
						},
						location,
					),
				);
				return;
			}

			seenHeadingIds.add(id);
			const title =
				parsed.caption || parsed.label || parsed.dataFile || pluginId;

			if (pluginId === "section") {
				sectionNumber += 1;
				subsectionNumber = 0;
				subsubsectionNumber = 0;
				currentSectionId = id;
				currentSubsectionId = undefined;
				headings.push({
					id,
					pluginId,
					label: referenceInput,
					title,
					level: HEADING_LEVEL_BY_PLUGIN_ID.section,
					number: String(sectionNumber),
				});
				return;
			}

			if (pluginId === "subsection") {
				if (!currentSectionId) {
					diagnostics.push(
						createParseDiagnostic(
							{
								code: "article-heading-parent-missing",
								severity: "error",
								message: `Subsection "${id}" is missing a parent section.`,
							},
							location,
						),
					);
					return;
				}

				subsectionNumber += 1;
				subsubsectionNumber = 0;
				currentSubsectionId = id;
				headings.push({
					id,
					pluginId,
					label: referenceInput,
					title,
					level: HEADING_LEVEL_BY_PLUGIN_ID.subsection,
					number: `${sectionNumber}.${subsectionNumber}`,
					parentId: currentSectionId,
				});
				return;
			}

			if (!currentSubsectionId) {
				diagnostics.push(
					createParseDiagnostic(
						{
							code: "article-heading-parent-missing",
							severity: "error",
							message: `Subsubsection "${id}" is missing a parent subsection.`,
						},
						location,
					),
				);
				return;
			}

			subsubsectionNumber += 1;
			headings.push({
				id,
				pluginId,
				label: referenceInput,
				title,
				level: HEADING_LEVEL_BY_PLUGIN_ID.subsubsection,
				number: `${sectionNumber}.${subsectionNumber}.${subsubsectionNumber}`,
				parentId: currentSubsectionId,
			});
			return;
		}

		const displayAs = pluginRegistry.displayAsByPluginId.get(pluginId);
		if (
			displayAs === DisplayAs.CITE ||
			displayAs === DisplayAs.REF ||
			displayAs === DisplayAs.LINK
		) {
			return;
		}

		const id = toDirectiveId(pluginId, normalizedReference);
		if (seenLabeledBlockIds.has(id)) {
			diagnostics.push(
				createParseDiagnostic(
					{
						code: "article-labeled-block-duplicate-label",
						severity: "error",
						message: `Duplicate labeled block detected for "${id}".`,
					},
					location,
				),
			);
			return;
		}

		seenLabeledBlockIds.add(id);
		const family = resolveFamily(pluginId, pluginRegistry);
		const nextNumber = (blockCounterByFamily.get(family) ?? 0) + 1;
		blockCounterByFamily.set(family, nextNumber);

		labeledBlocks.push({
			id,
			pluginId,
			label: referenceInput,
			number: nextNumber,
		});
	});

	return {
		headings,
		labeledBlocks,
		citations,
		diagnostics,
	};
}
