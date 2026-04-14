import {
	normalizeReferenceKey,
	parseDirectiveNode,
} from "@/components/artichale/core/artichale.util";
import type { PluginDefinition } from "@/components/artichale/types/plugin.types";
import {
	DirectiveKind,
	DisplayAs,
} from "@/components/artichale/types/plugin.types";

export const refPlugin: PluginDefinition = {
	id: "ref",
	name: "Reference",
	displayAs: DisplayAs.REF,
	kind: DirectiveKind.TEXT,
	autocomplete: true,
	render({ node, resolvedReferences }) {
		const parsed = parseDirectiveNode(node);
		const referenceRaw = parsed.label || parsed.dataFile || "";
		const normalizedReference = normalizeReferenceKey(referenceRaw);
		const resolved =
			resolvedReferences[referenceRaw] ??
			resolvedReferences[normalizedReference] ??
			Object.entries(resolvedReferences).find(([selector]) =>
				selector.endsWith(`:${normalizedReference}`),
			)?.[1];

		if (!resolved) {
			return <span className="art-ref">{referenceRaw || "?"}</span>;
		}

		return (
			<a className="art-ref" href={resolved.href}>
				{resolved.label}
			</a>
		);
	},
};
