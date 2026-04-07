import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

export type DataTableColumn<T> = {
	key: string;
	label: string;
	getValue: (row: T) => string;
};

type SortDirection = "asc" | "desc";

export type DataTableProps<T> = {
	columns: DataTableColumn<T>[];
	rows: T[];
	rowKey: (row: T) => string;
};

export function DataTable<T>({ columns, rows, rowKey }: DataTableProps<T>) {
	const [sort, setSort] = React.useState<{
		key: string;
		direction: SortDirection;
	} | null>(null);

	const sortedRows = React.useMemo(() => {
		if (!sort) return rows;
		const column = columns.find((col) => col.key === sort.key);
		if (!column) return rows;
		const multiplier = sort.direction === "asc" ? 1 : -1;

		return [...rows].sort((a, b) => {
			const av = column.getValue(a).toLowerCase();
			const bv = column.getValue(b).toLowerCase();
			if (av < bv) return -1 * multiplier;
			if (av > bv) return 1 * multiplier;
			return 0;
		});
	}, [rows, columns, sort]);

	const toggleSort = (key: string) => {
		setSort((prev) => {
			if (!prev || prev.key !== key) {
				return { key, direction: "asc" };
			}
			if (prev.direction === "asc") {
				return { key, direction: "desc" };
			}
			return null;
		});
	};

	return (
		<Table>
			<TableHeader>
				<TableRow>
					{columns.map((col) => {
						const isActive = sort?.key === col.key;
						return (
							<TableHead key={col.key}>
								<Button
									type="button"
									variant="ghost"
									className="-ml-2 h-8 px-2 font-semibold"
									onClick={() => toggleSort(col.key)}
								>
									{col.label}
									{isActive ? (
										sort?.direction === "asc" ? (
											<ArrowUp className="ml-1 h-3.5 w-3.5" />
										) : (
											<ArrowDown className="ml-1 h-3.5 w-3.5" />
										)
									) : (
										<ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-50" />
									)}
								</Button>
							</TableHead>
						);
					})}
				</TableRow>
			</TableHeader>
			<TableBody>
				{sortedRows.map((row) => (
					<TableRow key={rowKey(row)}>
						{columns.map((col) => (
							<TableCell key={col.key}>{col.getValue(row)}</TableCell>
						))}
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
