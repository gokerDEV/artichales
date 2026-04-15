import { collectNodeText } from "@/components/artichale/core/artichale.util";
import type { DirectiveNode } from "@/components/artichale/types/plugin.types.ts";
import type { ResolvedReference } from "@/components/artichale/types/reference.types.ts";
import type {
	ResolvedTemplatePluginConfig,
	TemplateResolved,
} from "@/components/artichale/types/template.types.ts";

type ComponentKey = keyof TemplateResolved["default"]["components"];

export type FlowSpan = "column" | "page";
type UnknownRecord = Record<string, unknown>;

function toStringAttr(
	attributes: DirectiveNode["attributes"] | undefined,
	key: string,
): string | undefined {
	const value = attributes?.[key];
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	return trimmed === "" ? undefined : trimmed;
}

export function resolveComponentConfig(
	template: TemplateResolved,
	component: ComponentKey,
): ResolvedTemplatePluginConfig {
	return template.default.components[component];
}

export function resolveFlowSpan(
	node: DirectiveNode,
	fallback: FlowSpan = "column",
): FlowSpan {
	const span =
		toStringAttr(node.attributes, "span_options") ??
		toStringAttr(node.attributes, "span") ??
		toStringAttr(node.attributes, "flow");
	if (!span) return fallback;
	const normalized = span.toLowerCase();
	if (
		normalized === "page" ||
		normalized === "full" ||
		/\bspan\s*[:=]\s*(page|full)\b/.test(normalized)
	) {
		return "page";
	}
	if (normalized === "column" || /\bspan\s*[:=]\s*column\b/.test(normalized)) {
		return "column";
	}
	return fallback;
}

export function resolveBlockSpacingStyle(
	config: ResolvedTemplatePluginConfig,
): {
	marginTop?: string;
	marginBottom?: string;
} {
	return {
		marginTop: config.spacingBefore,
		marginBottom: config.spacingAfter,
	};
}

export function toReadableTitle(rawValue: string, fallback: string): string {
	const cleaned = rawValue
		.trim()
		.replace(/\.[^/.]+$/, "")
		.replace(/[_-]+/g, " ")
		.trim();
	if (cleaned === "") return fallback;
	return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function extractReferenceNumber(
	reference: ResolvedReference | undefined,
): string {
	const label = reference?.label;
	if (!label) return "";
	const match = label.match(/(\d+(?:\.\d+)*)$/);
	return match?.[1] ?? "";
}

export function extractDirectiveCode(node: DirectiveNode): string {
	const children = Array.isArray(node.children) ? node.children : [];
	for (const child of children) {
		const record = child as unknown as UnknownRecord;
		if (record.type === "code" && typeof record.value === "string") {
			return record.value;
		}
	}

	const lines: string[] = [];
	for (const child of children) {
		const text = collectNodeText(child).trim();
		if (text !== "") lines.push(text);
	}
	return lines.join("\n");
}
