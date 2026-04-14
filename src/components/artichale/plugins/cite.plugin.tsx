import * as React from "react";
import { parseDirectiveNode } from "@/components/artichale/parser/directive.parser.ts";
import type { PluginDefinition } from "@/components/artichale/types/plugin.types";
import {
	DirectiveKind,
	DisplayAs,
} from "@/components/artichale/types/plugin.types";

function toCitationIds(raw: string): string[] {
	return raw
		.split(",")
		.map((part) => part.trim())
		.filter(Boolean);
}

function toCitationItems(ids: string[]): Array<{ id: string; key: string }> {
	const seen = new Map<string, number>();
	return ids.map((id) => {
		const count = (seen.get(id) ?? 0) + 1;
		seen.set(id, count);
		return {
			id,
			key: count === 1 ? id : `${id}-${count}`,
		};
	});
}

const CitationInline = React.memo(
	function CitationInline({
		citationIds,
		numericStyle,
	}: {
		citationIds: readonly string[];
		numericStyle: boolean;
	}) {
		const citedItems = toCitationItems([...citationIds]);
		return (
			<span className="art-cite">
				[
				{citedItems.map((item, index) => (
					<span key={item.key}>
						<a href={`#ref-${item.id}`}>{numericStyle ? index + 1 : item.id}</a>
						{index < citedItems.length - 1 ? ", " : null}
					</span>
				))}
				]
			</span>
		);
	},
	(previousProps, nextProps) =>
		previousProps.numericStyle === nextProps.numericStyle &&
		previousProps.citationIds.length === nextProps.citationIds.length &&
		previousProps.citationIds.every(
			(id, index) => id === nextProps.citationIds[index],
		),
);

export const citePlugin: PluginDefinition = {
	id: "cite",
	name: "Citation",
	displayAs: DisplayAs.CITE,
	kind: DirectiveKind.TEXT,
	autocomplete: true,
	render({ node, template }) {
		const parsed = parseDirectiveNode(node);
		const citedIds = toCitationIds(parsed.label || parsed.dataFile);
		const numericStyle =
			template.default.citationStyle === "numeric" ||
			template.default.citationStyle === "ieee";

		if (citedIds.length === 0) {
			return <span className="art-cite">[?]</span>;
		}

		return (
			<CitationInline citationIds={citedIds} numericStyle={numericStyle} />
		);
	},
};
