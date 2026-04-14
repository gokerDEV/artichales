import { parseDirectiveNode } from "@/components/artichale/parser/directive.parser.ts";
import type { PluginDefinition } from "@/components/artichale/types/plugin.types";
import {
	DirectiveKind,
	DisplayAs,
} from "@/components/artichale/types/plugin.types";

export const subsectionPlugin: PluginDefinition = {
	id: "subsection",
	name: "Subsection",
	displayAs: DisplayAs.SUBSECTION,
	kind: DirectiveKind.CONTAINER,
	autocomplete: true,
	render({ node }) {
		const parsed = parseDirectiveNode(node);
		const title =
			parsed.caption || parsed.label || parsed.dataFile || "Subsection";

		return (
				<h3 id={parsed.id.replaceAll(":", "-")} className="art-section">{title}</h3>
		);
	},
};
