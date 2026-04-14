import { parseDirectiveNode } from "@/components/artichale/parser/directive.parser.ts";
import type { PluginDefinition } from "@/components/artichale/types/plugin.types";
import {
	DirectiveKind,
	DisplayAs,
} from "@/components/artichale/types/plugin.types";

export const figurePlugin: PluginDefinition = {
	id: "figure",
	name: "Figure",
	displayAs: DisplayAs.FIGURE,
	kind: DirectiveKind.CONTAINER,
	autocomplete: true,
	async render({ node, fnAssetResolver }) {
		const parsed = parseDirectiveNode(node);
		const resolved = fnAssetResolver
			? await fnAssetResolver(parsed.dataFile || parsed.label)
			: null;

		return (
			<figure id={parsed.id.replaceAll(":", "-")} className="art-figure">
				{resolved ? (
					<img
						src={resolved.resolvedSrc}
						alt={parsed.caption || parsed.label}
					/>
				) : (
					<div>{parsed.dataFile || parsed.label || "Figure"}</div>
				)}
				{parsed.caption ? (
					<figcaption className="art-caption">{parsed.caption}</figcaption>
				) : null}
			</figure>
		);
	},
};
