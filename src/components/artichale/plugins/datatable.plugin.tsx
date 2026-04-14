import { parseDirectiveNode } from "@/components/artichale/parser/directive.parser.ts";
import type { PluginDefinition } from "@/components/artichale/types/plugin.types";
import {
	DirectiveKind,
	DisplayAs,
} from "@/components/artichale/types/plugin.types";

function inferRowsCount(data: unknown): number {
	if (Array.isArray(data)) return data.length;
	if (!data || typeof data !== "object") return 0;
	const record = data as Record<string, unknown>;
	return Array.isArray(record.rows) ? record.rows.length : 0;
}

export const datatablePlugin: PluginDefinition = {
	id: "datatable",
	name: "Datatable",
	displayAs: DisplayAs.TABLE,
	kind: DirectiveKind.CONTAINER,
	autocomplete: true,
	async render({ node, fnJSONAssetReader }) {
		const parsed = parseDirectiveNode(node);
		const data = fnJSONAssetReader
			? await fnJSONAssetReader<unknown>(parsed.dataFile || parsed.label).catch(
					() => null,
				)
			: null;
		const rowsCount = inferRowsCount(data?.data);

		return (
			<figure id={parsed.id.replaceAll(":", "-")} className="art-table">
				<div>{rowsCount > 0 ? `Rows: ${rowsCount}` : "No rows available"}</div>
				{parsed.caption ? (
					<figcaption className="art-caption">{parsed.caption}</figcaption>
				) : null}
			</figure>
		);
	},
};
