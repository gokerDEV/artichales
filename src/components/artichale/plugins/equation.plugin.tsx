import { parseDirectiveNode } from "@/components/artichale/parser/directive.parser.ts";
import type { PluginDefinition } from "@/components/artichale/types/plugin.types";
import {
	DirectiveKind,
	DisplayAs,
} from "@/components/artichale/types/plugin.types";

export const equationPlugin: PluginDefinition = {
	id: "equation",
	name: "Equation",
	displayAs: DisplayAs.EQUATION,
	kind: DirectiveKind.CONTAINER,
	autocomplete: true,
	render({ node }) {
		const parsed = parseDirectiveNode(node);
		return (
			<figure id={parsed.id.replaceAll(":", "-")} className="art-table">
				<pre>
					<code>
						{parsed.caption || parsed.label || parsed.dataFile || "Equation"}
					</code>
				</pre>
			</figure>
		);
	},
};
