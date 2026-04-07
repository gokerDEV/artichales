import type React from "react";
import type { Components } from "react-markdown";

type RefIndexMap = Record<
	string,
	{
		kind: "plot" | "datatable";
		index: number;
	}
>;
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

export function createRefRender(refIndexById: RefIndexMap): Components["span"] {
	return function RefRender({ node, children, ...rest }: RefRenderProps) {
		const rawRefId =
			node?.properties?.dataRefId || node?.properties?.["data-ref-id"] || "";
		const refId = typeof rawRefId === "string" ? rawRefId.trim() : "";
		const normalizedRefId = normalizePlotId(refId);
		if (!normalizedRefId) {
			return <span {...rest}>{children}</span>;
		}

		const target = refIndexById[normalizedRefId];
		const label = target
			? target.kind === "plot"
				? `Figure ${target.index}`
				: `Table ${target.index}`
			: `ref:${normalizedRefId}`;
		const href = target
			? target.kind === "plot"
				? `#plot-${normalizedRefId}`
				: `#datatable-${normalizedRefId}`
			: `#${normalizedRefId}`;

		return (
			<span {...rest}>
				<a href={href} className="ref" title={`Go to ${normalizedRefId}`}>
					{label || children}
				</a>
			</span>
		);
	};
}
