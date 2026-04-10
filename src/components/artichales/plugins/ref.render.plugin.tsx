import type React from "react";
import type { Components } from "react-markdown";
import type { ResolvedReference } from "@/lib/article-analysis";
import type { PluginDefinition, RenderHookContext } from "./plugin.contract";

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
	anchorPrefix: string;
};

const REF_KIND_CONFIG: Record<RefKind, RefKindConfig> = {
	plot: {
		anchorPrefix: "plot",
	},
	datatable: {
		anchorPrefix: "datatable",
	},
};

function registerRefRenderRuntime(
	context: RenderHookContext,
): Partial<Components> {
	return {
		span: createRefRender(
			context.refIndexById,
			context.resolvedReferences,
			context.utilityClasses?.ref || "ref",
		),
	};
}

export const refRenderPlugin: PluginDefinition = {
	id: "ref-render",
	category: "ref",
	name: "Ref Render",
	hooks: {
		render: registerRefRenderRuntime,
	},
};

function normalizeRefId(raw: string): string {
	const trimmed = raw.trim();
	return trimmed.replace(/\.[^/.]+$/, "");
}

function normalizeCaptionId(type: string, key: string): string {
	const normalizedType = type.trim().toLowerCase();
	const normalizedKey = normalizeRefId(key).toLowerCase();
	return `caption-${normalizedType}-${normalizedKey}`;
}

export function createRefRender(
	refIndexById: RefIndexMap,
	resolvedReferences: Record<string, ResolvedReference>,
	refClassName: string,
): Components["span"] {
	return function RefRender({ node, children, ...rest }: RefRenderProps) {
		const restProps = rest as Record<string, unknown>;
		const rawCaptionType =
			node?.properties?.dataCaptionType ||
			node?.properties?.["data-caption-type"] ||
			restProps.dataCaptionType ||
			restProps["data-caption-type"];
		const rawCaptionKey =
			node?.properties?.dataCaptionKey ||
			node?.properties?.["data-caption-key"] ||
			restProps.dataCaptionKey ||
			restProps["data-caption-key"];
		const rawCaptionTitle =
			node?.properties?.dataCaptionTitle ||
			node?.properties?.["data-caption-title"] ||
			restProps.dataCaptionTitle ||
			restProps["data-caption-title"];
		const captionType =
			typeof rawCaptionType === "string" ? rawCaptionType.trim() : "";
		const captionKey =
			typeof rawCaptionKey === "string" ? rawCaptionKey.trim() : "";
		const captionTitle =
			typeof rawCaptionTitle === "string" ? rawCaptionTitle.trim() : "";

		if (captionType && captionKey) {
			const captionId = normalizeCaptionId(captionType, captionKey);
			if (captionTitle) {
				return (
					<span
						{...rest}
						id={captionId}
						className="caption-anchor my-2 block text-center text-xs italic"
					>
						{captionTitle}
					</span>
				);
			}
			return (
				<span
					{...rest}
					id={captionId}
					aria-hidden="true"
					className="caption-anchor sr-only"
				/>
			);
		}

		const rawRefId =
			node?.properties?.dataRefId ||
			node?.properties?.["data-ref-id"] ||
			restProps.dataRefId ||
			restProps["data-ref-id"] ||
			"";
		const refId = typeof rawRefId === "string" ? rawRefId.trim() : "";
		const normalizedRefId = normalizeRefId(refId);
		const hasRefId = normalizedRefId !== "";

		const resolved = resolvedReferences[normalizedRefId];
		const target = refIndexById[normalizedRefId];
		const config = target ? REF_KIND_CONFIG[target.kind] : null;
		const label =
			resolved?.label || (config && target ? `? ${target.index}`.trim() : "?");
		const href =
			resolved?.href ||
			(config ? `#${config.anchorPrefix}-${normalizedRefId}` : "#");

		return (
			<span {...rest}>
				{hasRefId ? (
					<a
						href={href}
						className={refClassName}
						title={`Go to ${normalizedRefId}`}
					>
						{label || children || "?"}
					</a>
				) : (
					children
				)}
			</span>
		);
	};
}
