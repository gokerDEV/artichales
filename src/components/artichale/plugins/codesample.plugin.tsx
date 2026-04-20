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

type CodeSampleBlockProps = {
	source: string;
	span: "column" | "page";
	marginTop?: string;
	marginBottom?: string;
};

const CodeSampleBlock = React.memo(function CodeSampleBlock({
	source,
	span,
	marginTop,
	marginBottom,
}: CodeSampleBlockProps) {
	if (!source || source.trim() === "") {
		return (
			<div
				className="art-codesample-empty"
				data-flow-span={span}
				style={{ marginTop, marginBottom }}
			>
				<pre>
					<code>[No code found]</code>
				</pre>
			</div>
		);
	}

	return (
		<div
			className="art-codesample"
			data-flow-span={span}
			style={{ marginTop, marginBottom }}
		>
			<pre>
				<code>{source}</code>
			</pre>
		</div>
	);
});

CodeSampleBlock.displayName = "CodeSampleBlock";

export const codesamplePlugin: PluginDefinition = {
	id: "codesample",
	name: "Code Sample",
	displayAs: DisplayAs.CODE,
	kind: DirectiveKind.CONTAINER,
	autocomplete: true,
	render({ node, template }) {
		try {
			const parsed = parseDirectiveNode(node);
			const extracted = extractCodeFromChildren(node.children);
			const source =
				extracted || parsed.caption || parsed.label || parsed.dataFile || "";

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
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return (
				<div style={{ color: "red", padding: "10px", border: "1px solid red" }}>
					Error rendering code sample: {message}
				</div>
			);
		}
	},
};
