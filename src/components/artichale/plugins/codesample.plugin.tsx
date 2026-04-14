import { parseDirectiveNode } from "@/components/artichale/core/artichale.util";
import type { PluginDefinition } from "@/components/artichale/types/plugin.types";
import {
	DirectiveKind,
	DisplayAs,
} from "@/components/artichale/types/plugin.types";

export const codesamplePlugin: PluginDefinition = {
	id: "codesample",
	name: "Code Sample",
	displayAs: DisplayAs.CODE,
	kind: DirectiveKind.CONTAINER,
	autocomplete: true,
	render({ node }) {
		const parsed = parseDirectiveNode(node);
		return (
			<figure id={parsed.id.replaceAll(":", "-")} className="art-table">
				<pre>
					<code>{parsed.caption || parsed.label || parsed.dataFile}</code>
				</pre>
			</figure>
		);
	},
};
