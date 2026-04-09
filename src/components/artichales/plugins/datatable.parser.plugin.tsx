import type { Root } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { z } from "zod";
import type { PluginDefinition } from "./plugin.contract";

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

export const datatableParserPlugin: PluginDefinition = {
	id: "datatable-parser",
	category: "parser",
	name: "Datatable Parser",
	ownsSyntax: ["datatable"],
	configSchema: z
		.object({
			requireDataFile: z.boolean().optional(),
			defaultSpan: z.enum(["column", "page"]).optional(),
			enableFilteringInPrint: z.boolean().optional(),
		})
		.strict(),
	hooks: {},
};

export const remarkDatatable: Plugin<[], Root> = () => {
	return (tree: Root) => {
		visit(tree, (node: unknown) => {
			const directive = node as UnknownRecord;
			if (
				directive.type !== "containerDirective" ||
				directive.name !== "datatable"
			) {
				return;
			}

			const source = extractDirectiveLabel(directive);
			const bodyText = extractDirectiveBody(directive);

			const data = (directive.data as UnknownRecord) || {};
			directive.data = data;
			data.hName = "div";
			data.hProperties = {
				...(data.hProperties as UnknownRecord),
				"data-directive": "datatable",
				"data-datatable-source": source,
				"data-datatable-body": bodyText,
			};

			directive.children = [];
		});
	};
};
