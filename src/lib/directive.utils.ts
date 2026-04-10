import { parse as parseYaml } from "yaml";
import type { DirectiveCategory } from "@/components/artichales/plugins/plugin.contract";
import { isRecord, type UnknownRecord } from "@/lib/artichales.utils";

export type DirectiveFlow = {
	span: "column" | "page";
	breakBefore: "auto" | "page";
	breakAfter: "auto" | "page";
};

export type DirectiveOverride<TExtra extends UnknownRecord = UnknownRecord> = {
	caption: string;
	flow: DirectiveFlow;
	extra: TExtra;
};

type ParsedBody = {
	caption?: unknown;
	span?: unknown;
	breakBefore?: unknown;
	breakAfter?: unknown;
};

function parseDirectiveBody(raw: string): UnknownRecord | null {
	const bodyText = raw.trim();
	if (!bodyText) return null;
	try {
		const parsed = parseYaml(bodyText);
		return isRecord(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

function extractOverrideParts(record: UnknownRecord): {
	caption: string;
	flowPatch: Partial<DirectiveFlow>;
	extra: UnknownRecord;
} {
	const { caption, span, breakBefore, breakAfter, ...extra } =
		record as UnknownRecord & ParsedBody;
	return {
		caption: typeof caption === "string" ? caption.trim() : "",
		flowPatch: {
			span: span === "page" ? "page" : span === "column" ? "column" : undefined,
			breakBefore:
				breakBefore === "page"
					? "page"
					: breakBefore === "auto"
						? "auto"
						: undefined,
			breakAfter:
				breakAfter === "page"
					? "page"
					: breakAfter === "auto"
						? "auto"
						: undefined,
		},
		extra: extra as UnknownRecord,
	};
}

export function resolveDirectiveOverride<
	TExtra extends UnknownRecord = UnknownRecord,
>(
	bodyText: string,
	defaultSpan: DirectiveFlow["span"],
): DirectiveOverride<TExtra> {
	const defaultFlow: DirectiveFlow = {
		span: defaultSpan,
		breakBefore: "auto",
		breakAfter: "auto",
	};

	const trimmed = bodyText.trim();
	if (!trimmed) return { caption: "", flow: defaultFlow, extra: {} as TExtra };

	const parsedWhole = parseDirectiveBody(trimmed);
	if (parsedWhole) {
		const parts = extractOverrideParts(parsedWhole);
		return {
			caption: parts.caption,
			flow: { ...defaultFlow, ...parts.flowPatch },
			extra: parts.extra as TExtra,
		};
	}

	const lines = trimmed
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
	if (lines.length <= 1) {
		return { caption: trimmed, flow: defaultFlow, extra: {} as TExtra };
	}

	const caption = lines[0];
	const tailYaml = lines.slice(1).join("\n").trim();
	const parsedTail = parseDirectiveBody(tailYaml);
	if (parsedTail) {
		const parts = extractOverrideParts(parsedTail);
		return {
			caption: caption.trim(),
			flow: { ...defaultFlow, ...parts.flowPatch },
			extra: parts.extra as TExtra,
		};
	}

	return { caption: caption.trim(), flow: defaultFlow, extra: {} as TExtra };
}

export function getDirectiveNodeProperty(node: unknown, key: string): unknown {
	if (!isRecord(node) || !isRecord(node.properties)) return undefined;
	const properties = node.properties as UnknownRecord;
	return properties[key];
}

export function getDirectivePropertyWithFallback(
	node: unknown,
	props: UnknownRecord,
	key: string,
	fallbackKey?: string,
): unknown {
	return (
		getDirectiveNodeProperty(node, key) ??
		props[key] ??
		(fallbackKey ? props[fallbackKey] : undefined)
	);
}

export function getDirectiveString(
	node: unknown,
	props: UnknownRecord,
	key: string,
	fallbackKey?: string,
): string {
	const value = getDirectivePropertyWithFallback(node, props, key, fallbackKey);
	return typeof value === "string" ? value : "";
}

export function resolveDirectiveLabelPrefix(
	directive: string,
	primitive: DirectiveCategory,
	referenceLabels?: Record<string, string>,
): string {
	const directiveLabel = referenceLabels?.[directive];
	if (typeof directiveLabel === "string" && directiveLabel.trim() !== "") {
		return directiveLabel.trim();
	}
	const primitiveLabel = referenceLabels?.[primitive];
	if (typeof primitiveLabel === "string" && primitiveLabel.trim() !== "") {
		return primitiveLabel.trim();
	}
	return "?";
}
