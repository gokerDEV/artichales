import type { RootContent } from "mdast";
import type {
	DirectiveNode,
	ParsedDirective,
} from "@/components/artichale/types/plugin.types";

type UnknownRecord = Record<string, unknown>;

export function normalizeReferenceKey(value: string): string {
	return value
		.trim()
		.replace(/\.[^/.]+$/, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function toDirectiveId(pluginId: string, input: string): string {
	const normalizedInput = normalizeReferenceKey(input);
	return normalizedInput
		? `${pluginId}:${normalizedInput}`
		: `${pluginId}:unknown`;
}

export function sourcePosition(node: unknown): {
	offset?: number;
	line?: number;
	column?: number;
} {
	if (!node || typeof node !== "object") return {};
	const record = node as UnknownRecord;
	const position =
		record.position && typeof record.position === "object"
			? (record.position as UnknownRecord)
			: undefined;
	const start =
		position?.start && typeof position.start === "object"
			? (position.start as UnknownRecord)
			: undefined;

	return {
		offset: typeof start?.offset === "number" ? start.offset : undefined,
		line: typeof start?.line === "number" ? start.line : undefined,
		column: typeof start?.column === "number" ? start.column : undefined,
	};
}

export function collectNodeText(node: unknown): string {
	if (!node || typeof node !== "object") return "";

	const record = node as UnknownRecord;
	const parts: string[] = [];

	if (typeof record.value === "string" && record.value.trim() !== "") {
		parts.push(record.value.trim());
	}

	if (Array.isArray(record.children)) {
		for (const child of record.children) {
			const childText = collectNodeText(child);
			if (childText) parts.push(childText);
		}
	}

	return parts.join(" ").replace(/\s+/g, " ").trim();
}

function isDirectiveLabelParagraph(node: RootContent): boolean {
	const record = node as unknown as UnknownRecord;
	if (record.type !== "paragraph") return false;
	const data =
		record.data && typeof record.data === "object"
			? (record.data as UnknownRecord)
			: undefined;
	return data?.directiveLabel === true;
}

function asStringAttributes(
	attributes: DirectiveNode["attributes"],
): Record<string, string> {
	if (!attributes) return {};
	const result: Record<string, string> = {};
	for (const [key, value] of Object.entries(attributes)) {
		if (typeof value === "string") result[key] = value;
	}
	return result;
}

export function parseDirectiveNode(node: DirectiveNode): ParsedDirective {
	const attributes = asStringAttributes(node.attributes);
	const children = Array.isArray(node.children) ? node.children : [];

	const directiveLabelNode = children.find((child) =>
		isDirectiveLabelParagraph(child),
	);
	const label = directiveLabelNode ? collectNodeText(directiveLabelNode) : "";
	const remainingChildren = children.filter(
		(child) => child !== directiveLabelNode,
	);
	const caption = remainingChildren
		.map((child) => collectNodeText(child))
		.join(" ")
		.trim();
	const dataFile = attributes.data_file ?? attributes.datafile ?? label;
	const id = toDirectiveId(node.name, dataFile || label || node.name);

	return {
		id,
		label,
		dataFile,
		caption,
		attributes,
		children: remainingChildren,
	};
}
