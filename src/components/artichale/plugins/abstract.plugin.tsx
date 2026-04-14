import { parseDirectiveNode } from "@/components/artichale/parser/directive.parser.ts";
import type { PluginDefinition } from "@/components/artichale/types/plugin.types";
import {
	DirectiveKind,
	DisplayAs,
} from "@/components/artichale/types/plugin.types";

export const abstractPlugin: PluginDefinition = {
	id: "abstract",
	name: "Abstract",
	displayAs: DisplayAs.ABSTRACT,
	kind: DirectiveKind.CONTAINER,
	autocomplete: true,
	render({ node }) {
		const parsed = parseDirectiveNode(node);
		return (
			<section id={parsed.id.replaceAll(":", "-")} className="art-abstract">
				<strong className="art-abstract-title">Abstract</strong>
				{parsed.caption ? <p>{parsed.caption}</p> : null}
			</section>
		);
	},
};
