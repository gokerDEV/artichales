import * as React from "react";
import {
	normalizeReferenceKey,
	parseDirectiveNode,
} from "@/components/artichale/parser/directive.parser.ts";
import type { PluginDefinition } from "@/components/artichale/types/plugin.types";
import {
	DirectiveKind,
	DisplayAs,
} from "@/components/artichale/types/plugin.types";
import type { ResolvedReference } from "@/components/artichale/types/reference.types";

function resolveReference(
	resolvedReferences: Record<string, ResolvedReference>,
	rawSelector: string,
): ResolvedReference | undefined {
	const trimmedSelector = rawSelector.trim();
	if (trimmedSelector === "") return undefined;
	const normalized = normalizeReferenceKey(trimmedSelector);
	if (normalized === "") return undefined;

	const directCandidates = [trimmedSelector, normalized];
	for (const candidate of directCandidates) {
		const resolved = resolvedReferences[candidate];
		if (resolved) return resolved;
	}

	const suffixMatches = Object.entries(resolvedReferences).filter(
		([selector]) => selector.endsWith(`:${normalized}`),
	);
	if (suffixMatches.length === 1) return suffixMatches[0][1];

	// Ambiguous selector should not guess a target.
	return undefined;
}

const ResolvedReferenceLink = React.memo(
	function ResolvedReferenceLink({
		referenceRaw,
		resolved,
	}: {
		referenceRaw: string;
		resolved?: ResolvedReference;
	}) {
		if (!resolved) {
			return (
				<span
					className="art-ref"
					title={`Unresolved reference: ${referenceRaw || "?"}`}
				>
					{referenceRaw || "?"}
				</span>
			);
		}

		return (
			<a
				className="art-ref"
				href={resolved.href}
				title={referenceRaw || resolved.label}
			>
				{resolved.label}
			</a>
		);
	},
	(previousProps, nextProps) =>
		previousProps.referenceRaw === nextProps.referenceRaw &&
		previousProps.resolved?.label === nextProps.resolved?.label &&
		previousProps.resolved?.href === nextProps.resolved?.href,
);

export const refPlugin: PluginDefinition = {
	id: "ref",
	name: "Reference",
	displayAs: DisplayAs.REF,
	kind: DirectiveKind.TEXT,
	autocomplete: true,
	render({ node, resolvedReferences }) {
		const parsed = parseDirectiveNode(node);
		const referenceRaw = parsed.label || parsed.dataFile || "";
		const resolved = resolveReference(resolvedReferences, referenceRaw);
		return (
			<ResolvedReferenceLink referenceRaw={referenceRaw} resolved={resolved} />
		);
	},
};
