import type { Root } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

export type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringifyDirectiveAttributeValue(value: unknown): string | null {
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	return null;
}

function sanitizeParamKey(key: string): string {
	return key
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_");
}

function extractDirectiveAttributes(
	node: UnknownRecord,
): Record<string, string> {
	const attributes = node.attributes;
	if (!isRecord(attributes)) return {};
	const normalized: Record<string, string> = {};
	for (const [key, value] of Object.entries(attributes)) {
		const safeKey = sanitizeParamKey(key);
		if (!safeKey) continue;
		const normalizedValue = stringifyDirectiveAttributeValue(value);
		if (normalizedValue === null) continue;
		normalized[safeKey] = normalizedValue;
	}
	return normalized;
}

function extractDirectiveLabel(node: UnknownRecord): string {
	const children = node.children;
	if (!Array.isArray(children) || children.length === 0) return "";

	const firstChild = children[0];
	if (!firstChild || typeof firstChild !== "object") return "";

	const paragraph = firstChild as UnknownRecord;
	const isLabel = Boolean(
		paragraph.data &&
			typeof paragraph.data === "object" &&
			(paragraph.data as UnknownRecord).directiveLabel === true,
	);
	if (!isLabel || !Array.isArray(paragraph.children)) return "";

	const labelNode = paragraph.children.find(
		(child) => child && typeof child === "object",
	) as UnknownRecord | undefined;

	return typeof labelNode?.value === "string" ? labelNode.value.trim() : "";
}

function extractDirectiveBody(node: UnknownRecord): string {
	const children = node.children;
	if (!Array.isArray(children)) return "";

	const bodyParts: string[] = [];
	for (const child of children) {
		if (!child || typeof child !== "object") continue;
		const paragraph = child as UnknownRecord;

		const isLabel = Boolean(
			paragraph.data &&
				typeof paragraph.data === "object" &&
				(paragraph.data as UnknownRecord).directiveLabel === true,
		);
		if (isLabel || !Array.isArray(paragraph.children)) continue;

		for (const grandChild of paragraph.children) {
			if (!grandChild || typeof grandChild !== "object") continue;
			const textNode = grandChild as UnknownRecord;
			if (typeof textNode.value === "string") {
				bodyParts.push(textNode.value);
			}
		}
	}

	return bodyParts.join("\n");
}

function stripDirectiveLabelChildren(node: UnknownRecord): void {
	const children = node.children;
	if (!Array.isArray(children)) return;
	node.children = children.filter((child) => {
		if (!child || typeof child !== "object") return true;
		const paragraph = child as UnknownRecord;
		if (paragraph.type !== "paragraph") return true;
		const data = paragraph.data;
		return !(
			data &&
			typeof data === "object" &&
			(data as UnknownRecord).directiveLabel === true
		);
	});
}

function extractDirectiveBodyFromSource(
	node: UnknownRecord,
	source: string | undefined,
): string {
	if (typeof source !== "string" || source.length === 0) {
		return extractDirectiveBody(node);
	}
	if (!isRecord(node.position)) {
		return extractDirectiveBody(node);
	}
	const start = node.position.start;
	const end = node.position.end;
	if (!isRecord(start) || !isRecord(end)) {
		return extractDirectiveBody(node);
	}
	const startOffset =
		typeof start.offset === "number" ? Math.max(0, start.offset) : null;
	const endOffset =
		typeof end.offset === "number"
			? Math.min(source.length, Math.max(0, end.offset))
			: null;
	if (startOffset === null || endOffset === null || endOffset <= startOffset) {
		return extractDirectiveBody(node);
	}
	const blockSource = source.slice(startOffset, endOffset);
	const lines = blockSource.split(/\r?\n/);
	if (lines.length <= 2) return "";
	return lines.slice(1, -1).join("\n");
}

const NARRATIVE_DIRECTIVES = new Set([
	"abstract",
	"section",
	"subsection",
	"subsubsection",
]);
const LABEL_STRIP_DIRECTIVES = new Set([
	"section",
	"subsection",
	"subsubsection",
]);

function normalizeDirectiveNode(
	node: UnknownRecord,
	directiveName: string,
	source: string | undefined,
): void {
	const dataFileFromLabel = extractDirectiveLabel(node);
	const attrs = extractDirectiveAttributes(node);
	const dataFile = dataFileFromLabel || attrs.data_file || attrs.datafile || "";
	const raw = extractDirectiveBodyFromSource(node, source);
	const params: Record<string, string> = { ...attrs };
	if (dataFile) {
		params.data_file = dataFile;
	}
	const data = (node.data as UnknownRecord) || {};
	node.data = data;
	const paramProperties: Record<string, string> = {};
	for (const [key, value] of Object.entries(params)) {
		paramProperties[`data-directive-param-${key.replaceAll("_", "-")}`] = value;
	}
	data.hName = "div";
	data.hProperties = {
		...(data.hProperties as UnknownRecord),
		"data-directive": directiveName,
		"data-directive-raw": raw,
		"data-directive-data-file": dataFile,
		"data-directive-params": JSON.stringify(params),
		...paramProperties,
	};
	// Keep prose directive children intact for narrative blocks.
	if (NARRATIVE_DIRECTIVES.has(directiveName)) {
		if (LABEL_STRIP_DIRECTIVES.has(directiveName)) {
			stripDirectiveLabelChildren(node);
		}
		return;
	}
	// Data-driven directives normalize to metadata-only nodes.
	node.children = [];
}

/**
 * Single remark plugin that normalizes all container and leaf directives.
 * Extracts `raw` (body text) and `data_file` (label) for each directive
 * so render plugins receive a consistent, ready-to-use data shape.
 */
export const remarkNormalizeDirectives: Plugin<[], Root> = () => {
	return (tree: Root, file: { value?: unknown }) => {
		const sourceText = typeof file.value === "string" ? file.value : undefined;
		visit(tree, (node: unknown) => {
			const n = node as UnknownRecord;
			if (n.type !== "containerDirective" && n.type !== "leafDirective") {
				return;
			}
			if (typeof n.name !== "string" || !n.name) return;
			normalizeDirectiveNode(n, n.name, sourceText);
		});
	};
};
