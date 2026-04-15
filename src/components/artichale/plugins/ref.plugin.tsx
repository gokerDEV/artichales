import * as React from "react";
import { parseDirectiveNode } from "@/components/artichale/core/artichale.util";
import type { PluginDefinition } from "@/components/artichale/types/plugin.types";
import {
	DirectiveKind,
	DisplayAs,
} from "@/components/artichale/types/plugin.types";
import type { ResolvedReference } from "@/components/artichale/types/reference.types";

function resolveReference(
	resolvedReferences: ReadonlyMap<string, ResolvedReference>,
	rawSelector: string,
): ResolvedReference | undefined {
	const selector = rawSelector.trim();
	if (selector === "") return undefined;
	return resolvedReferences.get(selector);
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
