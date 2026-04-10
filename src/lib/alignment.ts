import remarkParse from "remark-parse";
import { unified } from "unified";

type UnknownRecord = Record<string, unknown>;

export type AlignmentHeading = {
	id: string;
	text: string;
	startOffset: number;
};

function normalizeHeadingSlug(text: string): string {
	const slug = text
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return slug || "heading";
}

function extractNodeText(node: unknown): string {
	if (!node || typeof node !== "object") return "";
	const record = node as UnknownRecord;
	const ownValue = typeof record.value === "string" ? record.value : "";
	const children = Array.isArray(record.children) ? record.children : [];
	return [ownValue, ...children.map((child) => extractNodeText(child))]
		.join("")
		.trim();
}

function walkTree(node: unknown, visit: (node: UnknownRecord) => void): void {
	if (!node || typeof node !== "object") return;
	const record = node as UnknownRecord;
	visit(record);
	const children = Array.isArray(record.children) ? record.children : [];
	for (const child of children) {
		walkTree(child, visit);
	}
}

export function buildAlignmentHeadingId(
	headingText: string,
	occurrence: number,
): string {
	return `${normalizeHeadingSlug(headingText)}-${occurrence}`;
}

export function collectAlignmentHeadings(content: string): AlignmentHeading[] {
	const tree = unified().use(remarkParse).parse(content) as unknown;
	const slugCounts = new Map<string, number>();
	const headings: AlignmentHeading[] = [];

	walkTree(tree, (node) => {
		if (node.type !== "heading") return;
		const text = extractNodeText(node) || "Heading";
		const normalized = normalizeHeadingSlug(text);
		const occurrence = (slugCounts.get(normalized) ?? 0) + 1;
		slugCounts.set(normalized, occurrence);
		const position = (node.position as UnknownRecord | undefined)?.start as
			| UnknownRecord
			| undefined;
		const startOffset =
			typeof position?.offset === "number" ? position.offset : 0;

		headings.push({
			id: buildAlignmentHeadingId(text, occurrence),
			text,
			startOffset,
		});
	});

	return headings.sort((a, b) => a.startOffset - b.startOffset);
}

export function getHeadingIdForSourceOffset(
	headings: AlignmentHeading[],
	offset: number,
): string | null {
	if (headings.length === 0) return null;
	const normalizedOffset = Math.max(0, Math.floor(offset));
	let candidate = headings[0];
	for (const heading of headings) {
		if (heading.startOffset > normalizedOffset) break;
		candidate = heading;
	}
	return candidate.id;
}

export function getSourceOffsetForHeadingId(
	headings: AlignmentHeading[],
	headingId: string,
): number | null {
	const match = headings.find((heading) => heading.id === headingId);
	return match ? match.startOffset : null;
}
