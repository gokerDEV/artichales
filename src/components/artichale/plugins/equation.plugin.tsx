import * as React from "react";
import {
	extractDirectiveCode,
	resolveBlockSpacingStyle,
	resolveComponentConfig,
	resolveFlowSpan,
} from "@/components/artichale/base/plugin.shared.ts";
import { parseDirectiveNode } from "@/components/artichale/core/artichale.util";
import type { PluginDefinition } from "@/components/artichale/types/plugin.types";
import {
	DirectiveKind,
	DisplayAs,
} from "@/components/artichale/types/plugin.types";

const EquationBlock = React.memo(
	function EquationBlock({
		expression,
		span,
		marginTop,
		marginBottom,
	}: {
		expression: string;
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
				<div className="px-4 py-3 text-center">
					<code>{expression || "Equation expression missing."}</code>
				</div>
			</div>
		);
	},
	(previousProps, nextProps) =>
		previousProps.expression === nextProps.expression &&
		previousProps.span === nextProps.span &&
		previousProps.marginTop === nextProps.marginTop &&
		previousProps.marginBottom === nextProps.marginBottom,
);

export const equationPlugin: PluginDefinition = {
	id: "equation",
	name: "Equation",
	displayAs: DisplayAs.EQUATION,
	kind: DirectiveKind.CONTAINER,
	autocomplete: true,
	render({ node, template }) {
		const parsed = parseDirectiveNode(node);
		const config = resolveComponentConfig(template, "equation");
		const fallbackSpan = config.defaultSpan === "page" ? "page" : "column";
		const span = resolveFlowSpan(node, fallbackSpan);
		const expression =
			extractDirectiveCode(node) ||
			parsed.caption ||
			parsed.label ||
			parsed.dataFile ||
			"";
		const spacing = resolveBlockSpacingStyle(config);
		return (
			<EquationBlock
				expression={expression}
				span={span}
				marginTop={spacing.marginTop}
				marginBottom={spacing.marginBottom}
			/>
		);
	},
};
