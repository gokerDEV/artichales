import { parseDirectiveNode } from "@/components/artichale/parser/directive.parser.ts";
import type { PluginDefinition } from "@/components/artichale/types/plugin.types";
import {
	DirectiveKind,
	DisplayAs,
} from "@/components/artichale/types/plugin.types";

export const fnPlugin: PluginDefinition = {
	id: "fn",
	name: "Footnote Link",
	displayAs: DisplayAs.LINK,
	kind: DirectiveKind.TEXT,
	autocomplete: true,
	render({ node }) {
		const parsed = parseDirectiveNode(node);
		const label = parsed.label || parsed.dataFile || "fn";
		return (
			<a className="art-ref" href={`#fn-${label}`}>
				[{label}]
			</a>
		);
	},
};
