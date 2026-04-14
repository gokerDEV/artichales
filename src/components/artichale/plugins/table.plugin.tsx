import { parseDirectiveNode } from "@/components/artichale/parser/directive.parser.ts";
import type { PluginDefinition } from "@/components/artichale/types/plugin.types";
import {
	DirectiveKind,
	DisplayAs,
} from "@/components/artichale/types/plugin.types";

export const tablePlugin: PluginDefinition = {
	id: "table",
	name: "Table",
	displayAs: DisplayAs.TABLE,
	kind: DirectiveKind.CONTAINER,
	autocomplete: true,
	render({ node }) {
		const parsed = parseDirectiveNode(node);
		return (
			<figure id={parsed.id.replaceAll(":", "-")} className="art-table">
				<div>
					{parsed.caption || parsed.label || parsed.dataFile || "Table"}
				</div>
			</figure>
		);
	},
};
