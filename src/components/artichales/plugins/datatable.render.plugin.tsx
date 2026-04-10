import * as React from "react";
import { useDirectiveJsonData } from "@/components/artichales/plugins/directive-data-file";
import { DataTable } from "@/components/ui/data-table";
import type {
	DirectiveComponentProps,
	DirectiveRendererDefinition,
	PluginDefinition,
	RenderHookContext,
} from "./plugin.contract";

type DatatableColumn = {
	key: string;
	label: string;
};

type DatatableDefinition = {
	columns: DatatableColumn[];
	rows: Array<Record<string, unknown>>;
};

type DatatableRow = Record<string, unknown> & {
	__rowKey: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toCellString(value: unknown): string {
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

function resolveDatatableDefinition(
	rawData: unknown,
): DatatableDefinition | null {
	if (!rawData) return null;

	if (Array.isArray(rawData)) {
		const rows = rawData.filter((item) => isRecord(item));
		if (rows.length === 0) return null;
		return {
			columns: Object.keys(rows[0]).map((key) => ({ key, label: key })),
			rows,
		};
	}

	if (!isRecord(rawData)) return null;
	const rows = Array.isArray(rawData.rows)
		? rawData.rows.filter((item) => isRecord(item))
		: [];
	if (rows.length === 0) return null;
	const columns = Array.isArray(rawData.columns)
		? rawData.columns
				.filter((item) => isRecord(item) && typeof item.key === "string")
				.map((item) => ({
					key: String(item.key),
					label: typeof item.label === "string" ? item.label : String(item.key),
				}))
		: Object.keys(rows[0]).map((key) => ({ key, label: key }));
	return {
		columns,
		rows,
	};
}

const DatatableVisual = React.memo(function DatatableVisual({
	definition,
	target,
}: {
	definition: DatatableDefinition;
	target: "web" | "print";
}) {
	const [query, setQuery] = React.useState("");
	const normalizedQuery = query.trim().toLowerCase();
	const filteredRows = React.useMemo(
		() =>
			normalizedQuery.length === 0
				? definition.rows
				: definition.rows.filter((row) =>
						definition.columns.some((column) =>
							toCellString(row[column.key])
								.toLowerCase()
								.includes(normalizedQuery),
						),
					),
		[definition, normalizedQuery],
	);
	const keyedRows: DatatableRow[] = React.useMemo(
		() =>
			filteredRows.map((row) => ({
				...row,
				__rowKey:
					typeof row.id === "string" && row.id.trim() !== ""
						? row.id
						: JSON.stringify(row),
			})),
		[filteredRows],
	);
	const columns = React.useMemo(
		() =>
			definition.columns.map((column) => ({
				key: column.key,
				label: column.label,
				getValue: (row: DatatableRow) => toCellString(row[column.key]),
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
						{filteredRows.length}/{definition.rows.length}
					</span>
				</div>
			) : null}
			<div className="overflow-x-auto rounded-md border border-border">
				<DataTable
					columns={columns}
					rows={keyedRows}
					rowKey={(row: DatatableRow) => row.__rowKey}
				/>
			</div>
		</>
	);
});

function DatatableDirectiveRender({
	params,
	config,
	target,
	...rest
}: DirectiveComponentProps) {
	const dataFile = params.data_file;
	const { data } = useDirectiveJsonData<DatatableDefinition>(dataFile);
	const definition = React.useMemo(
		() => resolveDatatableDefinition(data),
		[data],
	);

	if (!definition) {
		return (
			<div
				{...rest}
				className="rounded-md border border-red-300 bg-red-50 p-3 text-red-700 text-xs"
			>
				Datatable data file not found or invalid:{" "}
				<strong>{dataFile || "(missing)"}</strong>
			</div>
		);
	}

	return (
		<div
			{...rest}
			className="datatable"
			data-flow-span={config.defaultSpan}
			style={{
				marginTop: config.spacingBefore,
				marginBottom: config.spacingAfter,
			}}
		>
			<DatatableVisual definition={definition} target={target} />
		</div>
	);
}

function registerDatatableRenderRuntime(
	_: RenderHookContext,
): DirectiveRendererDefinition {
	return {
		directive: "datatable",
		category: "table",
		component: DatatableDirectiveRender,
	};
}

export const datatableRenderPlugin: PluginDefinition = {
	id: "datatable-render",
	category: "render",
	directiveCategory: "table",
	name: "Datatable Render",
	hooks: {
		directiveRender: registerDatatableRenderRuntime,
	},
};
