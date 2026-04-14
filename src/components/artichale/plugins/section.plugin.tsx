import { parseDirectiveNode } from "@/components/artichale/parser/directive.parser.ts";
import type { PluginDefinition } from "@/components/artichale/types/plugin.types";
import {
	DirectiveKind,
	DisplayAs,
} from "@/components/artichale/types/plugin.types";

export const sectionPlugin: PluginDefinition = {
	id: "section",
	name: "Section",
	displayAs: DisplayAs.SECTION,
	kind: DirectiveKind.CONTAINER,
	autocomplete: true,
	render({ node }) {
		const parsed = parseDirectiveNode(node);
		const title =
			parsed.caption || parsed.label || parsed.dataFile || "Section";

		return (
				<h2 id={parsed.id.replaceAll(":", "-")} className="art-section">{title}</h2>
		)
	},
};
