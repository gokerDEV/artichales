import * as React from "react";
import { parseDirectiveNode } from "@/components/artichale/parser/directive.parser.ts";
import {
	extractDirectiveCode,
	resolveBlockSpacingStyle,
	resolveComponentConfig,
	resolveFlowSpan,
} from "@/components/artichale/base/plugin.shared.ts";
import type { PluginDefinition } from "@/components/artichale/types/plugin.types";
import {
	DirectiveKind,
	DisplayAs,
} from "@/components/artichale/types/plugin.types";

const CodeSampleBlock = React.memo(
	function CodeSampleBlock({
		source,
		span,
		marginTop,
		marginBottom,
	}: {
		source: string;
		span: "column" | "page";
		marginTop?: string;
		marginBottom?: string;
	}) {
		return (
			<div
				className="art-table"
				data-flow-span={span}
				style={{ marginTop, marginBottom }}
			>
				<pre>
					<code>{source}</code>
				</pre>
			</div>
		);
	},
	(previousProps, nextProps) =>
		previousProps.source === nextProps.source &&
		previousProps.span === nextProps.span &&
		previousProps.marginTop === nextProps.marginTop &&
		previousProps.marginBottom === nextProps.marginBottom,
);

export const codesamplePlugin: PluginDefinition = {
	id: "codesample",
	name: "Code Sample",
	displayAs: DisplayAs.CODE,
	kind: DirectiveKind.CONTAINER,
	autocomplete: true,
	render({ node, template }) {
		const parsed = parseDirectiveNode(node);
		const source =
			extractDirectiveCode(node) ||
			parsed.caption ||
			parsed.label ||
			parsed.dataFile ||
			"";
		const config = resolveComponentConfig(template, "code");
		const fallbackSpan = config.defaultSpan === "page" ? "page" : "column";
		const span = resolveFlowSpan(node, fallbackSpan);
		const spacing = resolveBlockSpacingStyle(config);
		return (
			<CodeSampleBlock
				source={source}
				span={span}
				marginTop={spacing.marginTop}
				marginBottom={spacing.marginBottom}
			/>
		);
	},
};
