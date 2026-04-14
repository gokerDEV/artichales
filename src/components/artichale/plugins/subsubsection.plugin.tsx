import { parseDirectiveNode } from "@/components/artichale/parser/directive.parser.ts";
import type { PluginDefinition } from "@/components/artichale/types/plugin.types";
import {
	DirectiveKind,
	DisplayAs,
} from "@/components/artichale/types/plugin.types";

export const subsubsectionPlugin: PluginDefinition = {
	id: "subsubsection",
	name: "Subsubsection",
	displayAs: DisplayAs.SUBSUBSECTION,
	kind: DirectiveKind.CONTAINER,
	autocomplete: true,
	render({ node }) {
		const parsed = parseDirectiveNode(node);
		const title =
			parsed.caption || parsed.label || parsed.dataFile || "Subsubsection";

		return (
			<h4
				id={parsed.id.replaceAll(":", "-")}
				className="art-subsubsection"
			>{title}
			</h4>
		);
	},
};
