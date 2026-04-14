import * as React from "react";
import { parseDirectiveNode } from "@/components/artichale/parser/directive.parser.ts";
import {
	resolveBlockSpacingStyle,
	resolveComponentConfig,
	resolveFlowSpan,
} from "@/components/artichale/base/plugin.shared.ts";
import type { PluginDefinition } from "@/components/artichale/types/plugin.types";
import {
	DirectiveKind,
	DisplayAs,
} from "@/components/artichale/types/plugin.types";

const TableBlock = React.memo(
	function TableBlock({
		span,
		marginTop,
		marginBottom,
		jsonText,
		fallbackText,
		lastModified,
	}: {
		span: "column" | "page";
		marginTop?: string;
		marginBottom?: string;
		jsonText?: string;
		fallbackText: string;
		lastModified?: number;
	}) {
		void lastModified;
		return (
			<div
				className="art-table"
				data-flow-span={span}
				style={{ marginTop, marginBottom }}
			>
				{jsonText ? (
					<pre className="overflow-x-auto p-3 text-sm">
						<code>{jsonText}</code>
					</pre>
				) : (
					<div className="p-3 text-sm">{fallbackText}</div>
				)}
			</div>
		);
	},
	(previousProps, nextProps) => {
		if (previousProps.span !== nextProps.span) return false;
		if (previousProps.marginTop !== nextProps.marginTop) return false;
		if (previousProps.marginBottom !== nextProps.marginBottom) return false;
		if (
			typeof previousProps.lastModified === "number" &&
			typeof nextProps.lastModified === "number"
		) {
			return previousProps.lastModified === nextProps.lastModified;
		}
		return (
			previousProps.jsonText === nextProps.jsonText &&
			previousProps.fallbackText === nextProps.fallbackText
		);
	},
);

export const tablePlugin: PluginDefinition = {
	id: "table",
	name: "Table",
	displayAs: DisplayAs.TABLE,
	kind: DirectiveKind.CONTAINER,
	autocomplete: true,
	async render({ node, fnJSONAssetReader, template }) {
		const parsed = parseDirectiveNode(node);
		const source = parsed.dataFile || parsed.label;
		const loaded = source
			? await fnJSONAssetReader?.<unknown>(source).catch(() => null)
			: null;
		const config = resolveComponentConfig(template, "table");
		const fallbackSpan = config.defaultSpan === "page" ? "page" : "column";
		const span = resolveFlowSpan(node, fallbackSpan);
		const spacing = resolveBlockSpacingStyle(config);
		const jsonText = loaded?.data
			? JSON.stringify(loaded.data, null, 2)
			: undefined;
		const fallbackText = parsed.caption || source || "Table content is empty.";

		return (
			<TableBlock
				span={span}
				marginTop={spacing.marginTop}
				marginBottom={spacing.marginBottom}
				jsonText={jsonText}
				fallbackText={fallbackText}
				lastModified={loaded?.lastModified}
			/>
		);
	},
};
