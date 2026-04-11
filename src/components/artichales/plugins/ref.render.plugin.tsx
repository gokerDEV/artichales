import type React from "react";
import type { Components } from "react-markdown";
import type { ResolvedReference } from "@/lib/article-analysis";
import type { PluginDefinition, RenderHookContext } from "./plugin.contract";

type RefRenderProps = {
	node?: {
		properties?: Record<string, unknown>;
	};
	children?: React.ReactNode;
} & React.HTMLAttributes<HTMLSpanElement>;
function registerRefRenderRuntime(
	context: RenderHookContext,
): Partial<Components> {
	return {
		span: createRefRender(
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
			const expectedSelector = `${captionType.toLowerCase()}:${normalizeRefId(
				captionKey,
			).toLowerCase()}`;
			const resolvedLabel = resolvedReferences[expectedSelector]?.label;
			const displayLabel = resolvedLabel ? `${resolvedLabel}. ` : "";

			if (captionTitle) {
				return (
					<span
						{...rest}
						id={captionId}
						className="caption-anchor my-2 block text-center text-xs italic"
					>
						{displayLabel && (
							<span className="font-semibold not-italic text-[var(--ac-text-color)] mr-1">
								{displayLabel}
							</span>
						)}
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
		const label = resolved?.label || "?";
		const href = resolved?.href || "#";

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
