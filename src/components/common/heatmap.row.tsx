import type React from "react";

interface HeatmapRowProps {
	scores: number[]; // [M, A, T, C, H]
	loading?: boolean;
	// When provided, each cell becomes clickable and calls this with the column letter
	onColumnClick?: (letter: string) => void;
}

export const MATCH_COLUMNS = [
	{ ideal: "#DD4433", heatMax: "#55CCCC", letter: "M", title: "Metadata", short: "Meta" },
	{ ideal: "#4488FF", heatMax: "#EECC33", letter: "A", title: "Access", short: "Access" },
	{ ideal: "#FFBB00", heatMax: "#2288CC", letter: "T", title: "Technical", short: "Tech" },
	{ ideal: "#8844BB", heatMax: "#88AA55", letter: "C", title: "Contextual", short: "Content" },
	{ ideal: "#11AA55", heatMax: "#993366", letter: "H", title: "Hierarchy", short: "HTML" },
];

const hexToRgb = (hex: string) => {
	const bigint = parseInt(hex.replace("#", ""), 16);
	return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
};

const rgbToHex = (r: number, g: number, b: number) => {
	return (
		"#" +
		((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()
	);
};

const interpolateColor = (score: number, ideal: string, heatMax: string) => {
	if (score >= 0.99) return ideal;

	const factor = score;

	const [r1, g1, b1] = hexToRgb(heatMax);
	const [r2, g2, b2] = hexToRgb(ideal);

	const r = Math.round(r1 + factor * (r2 - r1));
	const g = Math.round(g1 + factor * (g2 - g1));
	const b = Math.round(b1 + factor * (b2 - b1));

	return rgbToHex(r, g, b);
};

export const HeatmapRow: React.FC<HeatmapRowProps> = ({
	scores,
	loading,
	onColumnClick,
}) => {
	return (
		<div className="monochrome flex w-full gap-2">
			{MATCH_COLUMNS.map((col, idx) => {
				const score = scores[idx] !== undefined ? scores[idx] : null;

				let bg = "#dbdbdb";
				if (loading) {
					bg = col.ideal;
				} else if (score !== null) {
					bg = interpolateColor(score, col.ideal, col.heatMax);
				}

				const isClickable = !!onColumnClick;

				return (
					<button
						key={col.letter}
						type="button"
						disabled={!isClickable}
						onClick={isClickable ? () => onColumnClick(col.letter) : undefined}
						className={[
							"flex flex-1 flex-col items-center justify-center rounded-sm",
							"transition-colors duration-500 ease-in-out aspect-square",
							loading ? "animate-heatmap-loading" : "",
							isClickable
								? "cursor-pointer hover:brightness-90 active:brightness-75"
								: "cursor-default",
						]
							.filter(Boolean)
							.join(" ")}
						style={{
							backgroundColor: bg,
							...({ "--color-ideal": col.ideal, "--color-heatmax": col.heatMax } as React.CSSProperties),
						}}
						title={score !== null ? `${col.title}: ${(score * 100).toFixed(0)}%` : col.title}
					>
						<span
							className={`font-bold text-xl ${loading || score === null ? "text-white/30" : "hidden"
								}`}
						>
							{col.letter}
						</span>
						{score !== null && !loading && (
							<span className="mt-1 font-mono text-white/80 text-xs">
								{(score * 100).toFixed(0)}
							</span>
						)}
					</button>
				);
			})}
		</div>
	);
};
