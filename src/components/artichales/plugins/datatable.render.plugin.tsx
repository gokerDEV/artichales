import * as React from "react";
import { DirectiveCaption } from "@/components/artichales/plugins/directive-caption";
import { useDirectiveFrame } from "@/components/artichales/plugins/directive-frame";
import { DataTable } from "@/components/ui/data-table";
import type { DocumentTemplate } from "@/hooks/use-document";
import { isRecord, type UnknownRecord } from "@/lib/artichales.utils";
import { getDirectiveString } from "@/lib/directive.utils";
import { formatAssetId } from "@/lib/workspace";
import type {
	DirectiveComponentProps,
	DirectiveRendererDefinition,
	PluginDefinition,
	RenderHookContext,
} from "./plugin.contract";

type DatatableIndexMap = Record<string, number>;

type DatatableColumn = {
	key: string;
	label: string;
};

type DatatableDefinition = {
	columns: DatatableColumn[];
	rows: UnknownRecord[];
};

type DatatableTemplateDefaults = NonNullable<
	NonNullable<DocumentTemplate["componentDefaults"]>["table"]
>;

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
		const firstRow = rows[0];
		const columns = Object.keys(firstRow).map((key) => ({ key, label: key }));
		return { columns, rows };
	}

	if (!isRecord(rawData)) return null;

	const candidateRows = Array.isArray(rawData.rows)
		? rawData.rows.filter((item) => isRecord(item))
		: [];
	if (candidateRows.length === 0) return null;

	const candidateColumns = Array.isArray(rawData.columns)
		? rawData.columns
				.filter((col) => isRecord(col) && typeof col.key === "string")
				.map((col) => ({
					key: String(col.key),
					label: typeof col.label === "string" ? col.label : String(col.key),
				}))
		: [];

	const columns =
		candidateColumns.length > 0
			? candidateColumns
			: Object.keys(candidateRows[0]).map((key) => ({ key, label: key }));

	return {
		columns,
		rows: candidateRows,
	};
}

type DatatableRenderBlockProps = {
	source: string;
	bodyText: string;
	datatableFiles: Record<string, unknown>;
	datatableIndexById: DatatableIndexMap;
	target: "web" | "print";
	defaults?: DatatableTemplateDefaults;
	referenceLabels?: Record<string, string>;
	utilityClasses?: Record<string, string>;
};

type DatatableRow = UnknownRecord & {
	__rowKey: string;
};

type DatatableVisualProps = {
	definition: DatatableDefinition;
	filteredRows: DatatableDefinition["rows"];
	target: "web" | "print";
	query: string;
	onQueryChange: (value: string) => void;
};

const DatatableVisual = React.memo(function DatatableVisual({
	definition,
	filteredRows,
	target,
	query,
	onQueryChange,
}: DatatableVisualProps) {
	const columns = React.useMemo(
		() =>
			definition.columns.map((col) => ({
				key: col.key,
				label: col.label,
				getValue: (row: DatatableRow) => toCellString(row[col.key]),
			})),
		[definition.columns],
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

	return (
		<>
			{target === "web" ? (
				<div className="mb-2 flex items-center justify-between gap-3">
					<input
						type="text"
						value={query}
						onChange={(event) => onQueryChange(event.target.value)}
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

export function DatatableRenderBlock({
	source,
	bodyText,
	datatableFiles,
	datatableIndexById,
	target,
	defaults,
	referenceLabels,
	utilityClasses,
}: DatatableRenderBlockProps) {
	const data = datatableFiles[source];
	const definition = React.useMemo(
		() => resolveDatatableDefinition(data),
		[data],
	);
	const tableId = formatAssetId(source);
	const { flow, captionPosition, spacingBefore, spacingAfter, captionProps } =
		useDirectiveFrame({
			directive: "datatable",
			primitive: "table",
			bodyText,
			defaults,
			number: datatableIndexById[tableId],
			referenceLabels,
			utilityClasses,
		});

	const [query, setQuery] = React.useState("");
	const normalizedQuery = query.trim().toLowerCase();
	const handleQueryChange = React.useCallback((value: string) => {
		setQuery(value);
	}, []);
	const filteredRows = React.useMemo(
		() =>
			!definition
				? []
				: normalizedQuery.length === 0
					? definition.rows
					: definition.rows.filter((row) =>
							definition.columns.some((col) =>
								toCellString(row[col.key])
									.toLowerCase()
									.includes(normalizedQuery),
							),
						),
		[definition, normalizedQuery],
	);

	if (!definition) {
		return (
			<div className="rounded-md border border-red-300 bg-red-50 p-3 text-red-700 text-xs">
				Datatable source not found or invalid:{" "}
				<strong>{source || "(empty)"}</strong>
			</div>
		);
	}

	return (
		<div
			id={tableId ? `datatable-${tableId}` : undefined}
			className="datatable my-6"
			data-flow-span={flow.span}
			data-flow-break-before={flow.breakBefore}
			data-flow-break-after={flow.breakAfter}
			style={{
				marginTop: spacingBefore,
				marginBottom: spacingAfter,
			}}
		>
			{captionPosition === "top" ? (
				<DirectiveCaption {...captionProps} />
			) : null}
			<DatatableVisual
				definition={definition}
				filteredRows={filteredRows}
				target={target}
				query={query}
				onQueryChange={handleQueryChange}
			/>
			{captionPosition === "bottom" ? (
				<DirectiveCaption {...captionProps} />
			) : null}
		</div>
	);
}

function registerDatatableRenderRuntime(
	context: RenderHookContext,
): DirectiveRendererDefinition {
	return {
		directive: "datatable",
		primitive: "table",
		component: function DatatableDirectiveRender({
			node,
			...rest
		}: DirectiveComponentProps) {
			const restProps = rest as UnknownRecord;
			return (
				<DatatableRenderBlock
					source={getDirectiveString(
						node,
						restProps,
						"data-datatable-source",
						"dataDatatableSource",
					)}
					bodyText={getDirectiveString(
						node,
						restProps,
						"data-datatable-body",
						"dataDatatableBody",
					)}
					datatableFiles={context.plotFiles}
					datatableIndexById={context.datatableIndexById}
					target={context.target}
					defaults={context.templateDefaults?.table}
					referenceLabels={context.referenceLabels}
					utilityClasses={context.utilityClasses}
				/>
			);
		},
	};
}

export const datatableRenderPlugin: PluginDefinition = {
	id: "datatable-render",
	category: "render",
	name: "Datatable Render",
	hooks: {
		directiveRender: registerDatatableRenderRuntime,
	},
};
