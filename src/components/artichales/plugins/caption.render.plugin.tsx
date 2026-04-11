import React from "react";
import type { Components } from "react-markdown";
import type { ResolvedCaption } from "@/lib/article-analysis";
import type { PluginDefinition, RenderHookContext } from "./plugin.contract";

type CaptionRenderProps = {
	node?: {
		properties?: Record<string, unknown>;
	};
	children?: React.ReactNode;
} & React.HTMLAttributes<HTMLSpanElement>;

function registerCaptionRenderRuntime(
	context: RenderHookContext,
): Partial<Components> {
	return {
		caption: createCaptionRender(context.captions),
	};
}

export const captionRenderPlugin: PluginDefinition = {
	id: "caption-render",
	category: "caption",
	name: "Caption Render",
	hooks: {
		render: registerCaptionRenderRuntime,
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

export function createCaptionRender(
	captions: Record<string, ResolvedCaption>,
): Components["caption"] {
	return React.memo(function CaptionRender({
		node,
		children,
		...rest
	}: CaptionRenderProps) {
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

		if (!captionType || !captionKey) return null;

		const captionId = normalizeCaptionId(captionType, captionKey);
		const expectedSelector = `${captionType.toLowerCase()}:${normalizeRefId(captionKey).toLowerCase()}`;
		const resolvedLabel = captions[expectedSelector]?.label;
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
	});
}
