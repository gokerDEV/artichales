import * as React from "react";
import { parse as parseYaml } from "yaml";
import { DataTable } from "@/components/ui/data-table";

type UnknownRecord = Record<string, unknown>;
type DatatableIndexMap = Record<string, number>;

type DatatableColumn = {
	key: string;
	label: string;
};

type DatatableDefinition = {
	columns: DatatableColumn[];
	rows: UnknownRecord[];
};

type DatatableOverrideResult = {
	caption: string;
	flow: {
		span: "column" | "page";
		breakBefore: "auto" | "page";
		breakAfter: "auto" | "page";
	};
};
type DatatableTemplateDefaults = {
	captionPosition?: "top" | "bottom";
	defaultSpan?: "column" | "full";
	spacingBefore?: string;
	spacingAfter?: string;
};

function isRecord(value: unknown): value is UnknownRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeId(raw: string): string {
	const trimmed = raw.trim();
	return trimmed.replace(/\.[^/.]+$/, "");
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

const SPAN_MAP: Record<"column" | "full", "column" | "page"> = {
	column: "column",
	full: "page",
};

function resolveDatatableOverride(
	bodyText: string,
	templateDefaults?: DatatableTemplateDefaults,
): DatatableOverrideResult {
	const templateSpan = templateDefaults?.defaultSpan || "column";
	const defaultFlow = {
		span: SPAN_MAP[templateSpan],
		breakBefore: "auto" as const,
		breakAfter: "auto" as const,
	};
	if (!bodyText.trim()) return { caption: "", flow: defaultFlow };

	let parsedBody: unknown = {};
	try {
		parsedBody = parseYaml(bodyText);
	} catch {
		return { caption: bodyText.trim(), flow: defaultFlow };
	}

	if (isRecord(parsedBody)) {
		return {
			caption:
				typeof parsedBody.caption === "string" ? parsedBody.caption.trim() : "",
			flow: {
				span: parsedBody.span === "page" ? "page" : "column",
				breakBefore: parsedBody.breakBefore === "page" ? "page" : "auto",
				breakAfter: parsedBody.breakAfter === "page" ? "page" : "auto",
			},
		};
	}

	return {
		caption:
			typeof parsedBody === "string" ? parsedBody.trim() : bodyText.trim(),
		flow: defaultFlow,
	};
}

type DatatableRenderBlockProps = {
	source: string;
	bodyText: string;
	datatableFiles: Record<string, unknown>;
	datatableIndexById: DatatableIndexMap;
	target: "web" | "print";
	defaults?: DatatableTemplateDefaults;
};

type DatatableRow = UnknownRecord & {
	__rowKey: string;
};

export function DatatableRenderBlock({
	source,
	bodyText,
	datatableFiles,
	datatableIndexById,
	target,
	defaults,
}: DatatableRenderBlockProps) {
	const data = datatableFiles[source];
	const definition = resolveDatatableDefinition(data);
	const tableId = normalizeId(source);
	const tableNo = datatableIndexById[tableId];
	const { caption, flow } = resolveDatatableOverride(bodyText, defaults);
	const captionPosition = defaults?.captionPosition || "bottom";
	const spacingBefore = defaults?.spacingBefore || "0";
	const spacingAfter = defaults?.spacingAfter || "0";

	const [query, setQuery] = React.useState("");
	const normalizedQuery = query.trim().toLowerCase();

	if (!definition) {
		return (
			<div className="rounded-md border border-red-300 bg-red-50 p-3 text-red-700 text-xs">
				Datatable source not found or invalid:{" "}
				<strong>{source || "(empty)"}</strong>
			</div>
		);
	}

	const filteredRows =
		normalizedQuery.length === 0
			? definition.rows
			: definition.rows.filter((row) =>
					definition.columns.some((col) =>
						toCellString(row[col.key]).toLowerCase().includes(normalizedQuery),
					),
				);
	const keyedRows: DatatableRow[] = filteredRows.map((row) => ({
		...row,
		__rowKey:
			typeof row.id === "string" && row.id.trim() !== ""
				? row.id
				: JSON.stringify(row),
	}));

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
			{caption && captionPosition === "top" ? (
				<p className="title mt-2 text-center text-xs italic">
					{tableNo ? (
						<span className="label">{`Table ${tableNo}. `}</span>
					) : null}
					{caption}
				</p>
			) : null}
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
					columns={definition.columns.map((col) => ({
						key: col.key,
						label: col.label,
						getValue: (row: DatatableRow) => toCellString(row[col.key]),
					}))}
					rows={keyedRows}
					rowKey={(row: DatatableRow) => row.__rowKey}
				/>
			</div>
			{caption && captionPosition === "bottom" ? (
				<p className="title mt-2 text-center text-xs italic">
					{tableNo ? (
						<span className="label">{`Table ${tableNo}. `}</span>
					) : null}
					{caption}
				</p>
			) : null}
		</div>
	);
}
