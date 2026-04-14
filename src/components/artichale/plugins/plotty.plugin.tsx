import { parseDirectiveNode } from "@/components/artichale/core/artichale.util";
import type { PluginDefinition } from "@/components/artichale/types/plugin.types";
import {
	DirectiveKind,
	DisplayAs,
} from "@/components/artichale/types/plugin.types";

export const plottyPlugin: PluginDefinition = {
	id: "plotty",
	name: "Plotty",
	displayAs: DisplayAs.FIGURE,
	kind: DirectiveKind.CONTAINER,
	autocomplete: true,
	async render({ node, fnJSONAssetReader }) {
		const parsed = parseDirectiveNode(node);
		const data = fnJSONAssetReader
			? await fnJSONAssetReader<Record<string, unknown>>(
					parsed.dataFile || parsed.label,
				).catch(() => null)
			: null;

		return (
			<figure id={parsed.id.replaceAll(":", "-")} className="art-figure">
				<div>{data ? "Plot data loaded" : "Plot data unavailable"}</div>
				{parsed.caption ? (
					<figcaption className="art-caption">{parsed.caption}</figcaption>
				) : null}
			</figure>
		);
	},
};
