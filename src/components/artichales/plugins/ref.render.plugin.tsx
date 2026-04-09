import type React from "react";
import type { Components } from "react-markdown";
import type { PluginDefinition } from "./plugin.contract";

type RefKind = "plot" | "datatable";

type RefIndexMap = Record<
	string,
	{
		kind: RefKind;
		index: number;
	}
>;
type RefRenderProps = {
	node?: {
		properties?: Record<string, unknown>;
	};
	children?: React.ReactNode;
} & React.HTMLAttributes<HTMLSpanElement>;

type RefKindConfig = {
	label: string;
	anchorPrefix: string;
};

const REF_KIND_CONFIG: Record<RefKind, RefKindConfig> = {
	plot: {
		label: "Figure",
		anchorPrefix: "plot",
	},
	datatable: {
		label: "Table",
		anchorPrefix: "datatable",
	},
};

export const refRenderPlugin: PluginDefinition = {
	id: "ref-render",
	category: "render",
	name: "Ref Render",
	hooks: {},
};

function normalizeRefId(raw: string): string {
	const trimmed = raw.trim();
	return trimmed.replace(/\.[^/.]+$/, "");
}

export function createRefRender(
	refIndexById: RefIndexMap,
	refClassName: string,
): Components["span"] {
	return function RefRender({ node, children, ...rest }: RefRenderProps) {
		const rawRefId =
			node?.properties?.dataRefId || node?.properties?.["data-ref-id"] || "";
		const refId = typeof rawRefId === "string" ? rawRefId.trim() : "";
		const normalizedRefId = normalizeRefId(refId);
		const hasRefId = normalizedRefId !== "";

		const target = refIndexById[normalizedRefId];
		const config = target ? REF_KIND_CONFIG[target.kind] : null;
		const label = config
			? `${config.label} ${target.index}`
			: `ref:${normalizedRefId}`;
		const href = config
			? `#${config.anchorPrefix}-${normalizedRefId}`
			: `#${normalizedRefId}`;

		return (
			<span {...rest}>
				{hasRefId ? (
					<a
						href={href}
						className={refClassName}
						title={`Go to ${normalizedRefId}`}
					>
						{label || children}
					</a>
				) : (
					children
				)}
			</span>
		);
	};
}
