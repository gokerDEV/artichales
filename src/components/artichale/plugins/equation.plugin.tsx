import * as React from "react";
import type { RootContent } from "mdast";
import {
	resolveBlockSpacingStyle,
	resolveComponentConfig,
	resolveFlowSpan,
} from "@/components/artichale/core/plugin.shared.ts";
import { parseDirectiveNode } from "@/components/artichale/core/artichale.util";
import type { PluginDefinition } from "@/components/artichale/types/plugin.types";
import {
	DirectiveKind,
	DisplayAs,
} from "@/components/artichale/types/plugin.types";

function extractCodeFromChildren(children: RootContent[] | undefined): string {
	if (!Array.isArray(children) || children.length === 0) {
		return "";
	}

	for (const child of children) {
		if (child.type === "code") {
			const codeBlock = child as RootContent & { type: "code"; value: string };
			return codeBlock.value.trim();
		}
	}

	return "";
}

type EquationBlockProps = {
	expression: string;
	span: "column" | "page";
	marginTop?: string;
	marginBottom?: string;
};

const EquationBlock = React.memo(function EquationBlock({
	expression,
	span,
	marginTop,
	marginBottom,
}: EquationBlockProps) {
	return (
		<div
			className="art-equation"
			data-flow-span={span}
			style={{ marginTop, marginBottom }}
		>
			<div className="px-4 py-3 text-center">
				<code>{expression || "Equation expression missing."}</code>
			</div>
		</div>
	);
});

EquationBlock.displayName = "EquationBlock";

export const equationPlugin: PluginDefinition = {
	id: "equation",
	name: "Equation",
	displayAs: DisplayAs.EQUATION,
	kind: DirectiveKind.CONTAINER,
	autocomplete: true,
	render({ node, template }) {
		try {
			const parsed = parseDirectiveNode(node);
			const extracted = extractCodeFromChildren(node.children);
			const expression =
				extracted || parsed.caption || parsed.label || parsed.dataFile || "";

			const config = resolveComponentConfig(template, "equation");
			const fallbackSpan = config.defaultSpan === "page" ? "page" : "column";
			const span = resolveFlowSpan(node, fallbackSpan);
			const spacing = resolveBlockSpacingStyle(config);

			return (
				<EquationBlock
					expression={expression}
					span={span}
					marginTop={spacing.marginTop}
					marginBottom={spacing.marginBottom}
				/>
			);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return (
				<div style={{ color: "red", padding: "10px", border: "1px solid red" }}>
					Error rendering equation: {message}
				</div>
			);
		}
	},
};
