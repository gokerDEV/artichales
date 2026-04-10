type UnknownRecord = Record<string, unknown>;

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

	return bodyParts.join("\n").trim();
}

export function normalizeDirectiveNode(
	node: UnknownRecord,
	directiveName: string,
): void {
	const dataFile = extractDirectiveLabel(node);
	const raw = extractDirectiveBody(node);
	const data = (node.data as UnknownRecord) || {};
	node.data = data;
	data.hName = "div";
	data.hProperties = {
		...(data.hProperties as UnknownRecord),
		"data-directive": directiveName,
		"data-directive-raw": raw,
		"data-directive-data-file": dataFile,
	};
	node.children = [];
}
