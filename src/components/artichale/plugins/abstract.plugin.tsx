import * as React from "react";
import {
	resolveBlockSpacingStyle,
	resolveComponentConfig,
} from "@/components/artichale/base/plugin.shared.ts";
import { parseDirectiveNode } from "@/components/artichale/core/artichale.util";
import type { PluginDefinition } from "@/components/artichale/types/plugin.types";
import {
	DirectiveKind,
	DisplayAs,
} from "@/components/artichale/types/plugin.types";

const AbstractBlock = React.memo(
	function AbstractBlock({
		content,
		marginTop,
		marginBottom,
	}: {
		content: string;
		marginTop?: string;
		marginBottom?: string;
	}) {
		return (
			<section
				className="art-abstract"
				data-flow-span="column"
				style={{ marginTop, marginBottom }}
			>
				<strong className="art-abstract-title">Abstract</strong>
				{content ? <p>{content}</p> : null}
			</section>
		);
	},
	(previousProps, nextProps) =>
		previousProps.content === nextProps.content &&
		previousProps.marginTop === nextProps.marginTop &&
		previousProps.marginBottom === nextProps.marginBottom,
);

export const abstractPlugin: PluginDefinition = {
	id: "abstract",
	name: "Abstract",
	displayAs: DisplayAs.ABSTRACT,
	kind: DirectiveKind.CONTAINER,
	autocomplete: true,
	render({ node, template }) {
		const parsed = parseDirectiveNode(node);
		const content = parsed.caption;
		const config = resolveComponentConfig(template, "abstract");
		const spacing = resolveBlockSpacingStyle(config);
		return (
			<AbstractBlock
				content={content}
				marginTop={spacing.marginTop}
				marginBottom={spacing.marginBottom}
			/>
		);
	},
};
