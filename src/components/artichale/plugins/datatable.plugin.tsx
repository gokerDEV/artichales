import * as React from "react";
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
import { DataTable } from "@/components/ui/data-table";

type DatatableColumn = {
	key: string;
	label: string;
};

type DatatableRow = Record<string, unknown>;

type DatatableDefinition = {
	columns: DatatableColumn[];
	rows: DatatableRow[];
};

type KeyedDatatableRow = DatatableRow & {
	__rowKey: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toCellText(value: unknown): string {
	if (value === null || value === undefined) return "";
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

function resolveDatatableDefinition(raw: unknown): DatatableDefinition | null {
	if (Array.isArray(raw)) {
		const rows = raw.filter((row): row is DatatableRow => isRecord(row));
		if (rows.length === 0) return null;
		return {
			columns: Object.keys(rows[0]).map((key) => ({ key, label: key })),
			rows,
		};
	}

	if (!isRecord(raw)) return null;

	const rows = Array.isArray(raw.rows)
		? raw.rows.filter((row): row is DatatableRow => isRecord(row))
		: [];
	if (rows.length === 0) return null;

	const columns = Array.isArray(raw.columns)
		? raw.columns
				.filter(
					(column) =>
						isRecord(column) &&
						typeof column.key === "string" &&
						column.key.trim() !== "",
				)
				.map((column) => ({
					key: String(column.key),
					label:
						typeof column.label === "string" && column.label.trim() !== ""
							? column.label
							: String(column.key),
				}))
		: Object.keys(rows[0]).map((key) => ({ key, label: key }));

	return columns.length === 0 ? null : { columns, rows };
}

function toRowKey(row: DatatableRow): string {
	const id = row.id;
	if (typeof id === "string" && id.trim() !== "") return id;
	if (typeof id === "number" && Number.isFinite(id)) return String(id);
	try {
		return JSON.stringify(row);
	} catch {
		return Object.keys(row).join("|");
	}
}

function toKeyedRows(rows: DatatableRow[]): KeyedDatatableRow[] {
	const seen = new Map<string, number>();
	return rows.map((row) => {
		const base = toRowKey(row);
		const count = (seen.get(base) ?? 0) + 1;
		seen.set(base, count);
		return {
			...row,
			__rowKey: count === 1 ? base : `${base}-${count}`,
		};
	});
}

const DatatableVisual = React.memo(function DatatableVisual({
	definition,
	target,
	lastModified,
}: {
	definition: DatatableDefinition;
	target: "web" | "print";
	lastModified?: number;
}) {
	void lastModified;
	const [query, setQuery] = React.useState("");
	const normalizedQuery = query.trim().toLowerCase();

	const filteredRows = React.useMemo(
		() =>
			normalizedQuery === ""
				? definition.rows
				: definition.rows.filter((row) =>
						definition.columns.some((column) =>
							toCellText(row[column.key])
								.toLowerCase()
								.includes(normalizedQuery),
						),
					),
		[definition, normalizedQuery],
	);

	const keyedRows = React.useMemo(
		() => toKeyedRows(filteredRows),
		[filteredRows],
	);

	const tableColumns = React.useMemo(
		() =>
			definition.columns.map((column) => ({
				key: column.key,
				label: column.label,
				getValue: (row: KeyedDatatableRow) => toCellText(row[column.key]),
			})),
		[definition.columns],
	);

	return (
		<>
			{target === "web" ? (
				<div className="mb-2 flex items-center justify-between gap-3">
					<input
						type="text"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Filter table..."
						className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
					/>
					<span className="shrink-0 text-muted-foreground text-xs">
						{keyedRows.length}/{definition.rows.length}
					</span>
				</div>
			) : null}
			<div className="overflow-x-auto rounded-md border border-border">
				<DataTable
					columns={tableColumns}
					rows={keyedRows}
					rowKey={(row: KeyedDatatableRow) => row.__rowKey}
				/>
			</div>
		</>
	);
}, areDatatableVisualPropsEqual);

function areDatatableVisualPropsEqual(
	prevProps: {
		definition: DatatableDefinition;
		target: "web" | "print";
		lastModified?: number;
	},
	nextProps: {
		definition: DatatableDefinition;
		target: "web" | "print";
		lastModified?: number;
	},
): boolean {
	if (prevProps.target !== nextProps.target) return false;
	if (
		typeof prevProps.lastModified === "number" &&
		typeof nextProps.lastModified === "number"
	) {
		return prevProps.lastModified === nextProps.lastModified;
	}
	return prevProps.definition === nextProps.definition;
}

export const datatablePlugin: PluginDefinition = {
	id: "datatable",
	name: "Datatable",
	displayAs: DisplayAs.TABLE,
	kind: DirectiveKind.CONTAINER,
	autocomplete: true,
	async render({ node, fnJSONAssetReader, template, target }) {
		const parsed = parseDirectiveNode(node);
		const source = parsed.dataFile || parsed.label;
		const loaded = source
			? await fnJSONAssetReader(source, "").catch(() => null)
			: null;
		const definition = resolveDatatableDefinition(loaded?.data);
		const config = resolveComponentConfig(template, "table");
		const fallbackSpan = config.defaultSpan === "page" ? "page" : "column";
		const span = resolveFlowSpan(node, fallbackSpan);

		return (
			<div
				className="art-table"
				data-flow-span={span}
				style={resolveBlockSpacingStyle(config)}
			>
				{definition ? (
					<DatatableVisual
						definition={definition}
						target={target}
						lastModified={loaded?.lastModified}
					/>
				) : (
					<div className="p-3 text-sm">
						Unable to load datatable data from{" "}
						<strong>{source || "(missing source)"}</strong>.
					</div>
				)}
			</div>
		);
	},
};
