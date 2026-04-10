import * as React from "react";
import type { DirectiveCaptionProps } from "@/components/artichales/plugins/directive-caption";
import type { DirectivePrimitive } from "@/components/artichales/plugins/plugin.contract";
import type { UnknownRecord } from "@/lib/artichales.utils";
import {
	type DirectiveOverride,
	resolveDirectiveLabelPrefix,
	resolveDirectiveOverride,
} from "@/lib/directive.utils";

type DirectiveRenderDefaults = {
	captionPosition?: "top" | "bottom";
	defaultSpan?: "column" | "page";
	spacingBefore?: string;
	spacingAfter?: string;
};

type UseDirectiveFrameOptions = {
	directive: string;
	primitive: DirectivePrimitive;
	bodyText: string;
	defaults?: DirectiveRenderDefaults;
	number?: number;
	referenceLabels?: Record<string, string>;
	utilityClasses?: Record<string, string>;
	fallbackCaption?: string;
};

export type DirectiveFrameState<TExtra extends UnknownRecord> = {
	captionPosition: "top" | "bottom";
	spacingBefore: string;
	spacingAfter: string;
	captionProps: DirectiveCaptionProps;
} & DirectiveOverride<TExtra>;

export function useDirectiveFrame<TExtra extends UnknownRecord = UnknownRecord>(
	options: UseDirectiveFrameOptions,
): DirectiveFrameState<TExtra> {
	const {
		directive,
		primitive,
		bodyText,
		defaults,
		number,
		referenceLabels,
		utilityClasses,
		fallbackCaption,
	} = options;
	const captionPosition = defaults?.captionPosition || "bottom";
	const spacingBefore = defaults?.spacingBefore || "0";
	const spacingAfter = defaults?.spacingAfter || "0";
	const defaultSpan = defaults?.defaultSpan || "column";
	const resolved = React.useMemo(
		() => resolveDirectiveOverride<TExtra>(bodyText, defaultSpan),
		[bodyText, defaultSpan],
	);
	const captionText = resolved.caption || fallbackCaption || "";
	const labelPrefix = React.useMemo(
		() => resolveDirectiveLabelPrefix(directive, primitive, referenceLabels),
		[directive, primitive, referenceLabels],
	);
	const captionProps = React.useMemo(
		() => ({
			primitive,
			caption: captionText,
			number,
			labelPrefix,
			utilityClasses,
		}),
		[captionText, labelPrefix, number, primitive, utilityClasses],
	);

	return {
		...resolved,
		captionPosition,
		spacingBefore,
		spacingAfter,
		captionProps,
	};
}
