import { parseDirectiveNode } from "@/components/artichale/core/artichale.util";
import type { PluginDefinition } from "@/components/artichale/types/plugin.types";
import {
	DirectiveKind,
	DisplayAs,
} from "@/components/artichale/types/plugin.types";

export const citePlugin: PluginDefinition = {
	id: "cite",
	name: "Citation",
	displayAs: DisplayAs.CITE,
	kind: DirectiveKind.TEXT,
	autocomplete: true,
	render({ node }) {
		const parsed = parseDirectiveNode(node);
		const citedIds = (parsed.label || parsed.dataFile)
			.split(",")
			.map((part) => part.trim())
			.filter(Boolean);

		return (
			<span className="art-cite">
				[
				{citedIds.length > 0
					? citedIds.join(", ")
					: parsed.label || parsed.dataFile || "?"}
				]
			</span>
		);
	},
};
