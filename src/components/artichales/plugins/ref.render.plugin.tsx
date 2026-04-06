import type React from "react";
import type { Components } from "react-markdown";

type PlotIndexMap = Record<string, number>;
type RefRenderProps = {
	node?: {
		properties?: Record<string, unknown>;
	};
	children?: React.ReactNode;
} & React.HTMLAttributes<HTMLSpanElement>;

function normalizePlotId(raw: string): string {
	const trimmed = raw.trim();
	return trimmed.replace(/\.[^/.]+$/, "");
}

export function createRefRender(
	plotIndexById: PlotIndexMap,
): Components["span"] {
	return function RefRender({ node, children, ...rest }: RefRenderProps) {
		const rawRefId =
			node?.properties?.dataRefId || node?.properties?.["data-ref-id"] || "";
		const refId = typeof rawRefId === "string" ? rawRefId.trim() : "";
		const normalizedRefId = normalizePlotId(refId);
		if (!normalizedRefId) {
			return <span {...rest}>{children}</span>;
		}

		const figureNo = plotIndexById[normalizedRefId];
		const label = figureNo ? `Figure ${figureNo}` : `ref:${normalizedRefId}`;

		return (
			<span {...rest}>
				<a
					href={`#plot-${normalizedRefId}`}
					className="rounded border border-sky-200 bg-sky-50 px-1 py-0.5 font-mono text-[0.85em] text-sky-800 no-underline hover:bg-sky-100"
					title={`Go to ${normalizedRefId}`}
				>
					[{label || children}]
				</a>
			</span>
		);
	};
}
