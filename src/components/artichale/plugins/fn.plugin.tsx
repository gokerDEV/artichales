import * as React from "react";
import { parseDirectiveNode } from "@/components/artichale/core/artichale.util";
import type { PluginDefinition } from "@/components/artichale/types/plugin.types";
import {
	DirectiveKind,
	DisplayAs,
} from "@/components/artichale/types/plugin.types";

const FootnoteRef = React.memo(
	function FootnoteRef({ label, target }: { label: string; target: string }) {
		return (
			<sup>
				<a className="art-ref" href={`#fn-${target}`}>
					[{label}]
				</a>
			</sup>
		);
	},
	(previousProps, nextProps) =>
		previousProps.label === nextProps.label &&
		previousProps.target === nextProps.target,
);

export const fnPlugin: PluginDefinition = {
	id: "fn",
	name: "Footnote Link",
	displayAs: DisplayAs.LINK,
	kind: DirectiveKind.TEXT,
	autocomplete: true,
	render({ node }) {
		const parsed = parseDirectiveNode(node);
		const label = (parsed.label || parsed.dataFile || "fn").trim();
		const target = label.replace(/\s+/g, "-").toLowerCase();
		return <FootnoteRef label={label} target={target} />;
	},
};
