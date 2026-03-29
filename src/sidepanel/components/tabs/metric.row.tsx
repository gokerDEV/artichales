import type React from "react";
import { cn } from "@/lib/utils";

interface MetricRowProps {
	id: string;
	value: number | null; // normalized 0–1, null = not yet run
	description: string;
}

// Convert a snake_case metric id to a human-readable label
const formatId = (id: string) =>
	id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Color band for the score pill
const scoreColor = (value: number) => {
	if (value >= 0.85) return "bg-emerald-500";
	if (value >= 0.6) return "bg-amber-400";
	return "bg-rose-500";
};

export const MetricRow: React.FC<MetricRowProps> = ({
	id,
	value,
	description,
}) => {
	// Strip the verbose normalization note from the description
	const shortDesc = description.split(". Normalization explanation:")[0];

	return (
		<div className="flex flex-col gap-1 rounded-md border bg-background px-3 py-2">
			<div className="flex items-center justify-between gap-2">
				<span className="text-xs font-medium leading-tight">{formatId(id)}</span>
				{value !== null ? (
					<span
						className={cn(
							"shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white",
							scoreColor(value),
						)}
					>
						{(value * 100).toFixed(0)}%
					</span>
				) : (
					<span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
						—
					</span>
				)}
			</div>
			<p className="text-[10px] leading-relaxed text-muted-foreground">
				{shortDesc}
			</p>
		</div>
	);
};
