import type { RootContent } from "mdast";
import type { DirectiveNode } from "@/components/artichale/types/plugin.types.ts";

type UnknownRecord = Record<string, unknown>;

export type ParsedDirective = {
	id: string;
	label: string;
	dataFile: string;
	caption: string;
};

export function normalizeReferenceKey(value: string): string {
	return value
		.trim()
		.replace(/\.[^/.]+$/, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function collectNodeText(node: unknown): string {
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

export function parseDirectiveNode(node: DirectiveNode): ParsedDirective {
	const children = Array.isArray(node.children) ? node.children : [];
	const attributes = node.attributes ?? {};
	const directiveLabelNode = children.find((child) =>
		isDirectiveLabelParagraph(child),
	);
	const label = directiveLabelNode ? collectNodeText(directiveLabelNode) : "";
	const contentChildren = children.filter(
		(child) => child !== directiveLabelNode,
	);
	const caption = contentChildren
		.map((child) => collectNodeText(child))
		.join(" ")
		.trim();
	const dataFile = attributes.data_file ?? attributes.datafile ?? label ?? "";
	const normalizedInput = normalizeReferenceKey(dataFile || label || node.name);

	return {
		id: normalizedInput
			? `${node.name}:${normalizedInput}`
			: `${node.name}:unknown`,
		label,
		dataFile,
		caption,
	};
}
