import type { PhrasingContent, Root, Text } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import type { PluginDefinition } from "./plugin.contract";

type TextDirectiveNode = {
	type: "textDirective";
	name?: string;
	attributes?: Record<string, unknown>;
	children?: Array<{ type?: string; value?: string }>;
	data?: Record<string, unknown>;
};

type CiteNode = {
	type: "cite";
	data: {
		hName: "cite";
		hProperties: {
			"data-cite-ids": string;
		};
	};
	children: Text[];
};

type RefNode = {
	type: "xref";
	data: {
		hName: "span";
		hProperties: {
			"data-ref-id": string;
		};
	};
	children: Text[];
};

function directiveLabel(node: TextDirectiveNode): string {
	if (!Array.isArray(node.children)) return "";
	return node.children
		.map((child) => (child.type === "text" && child.value ? child.value : ""))
		.join("")
		.trim();
}

function parseCitationIds(raw: string): string[] {
	return raw
		.split(",")
		.map((token) => token.trim())
		.filter(Boolean);
}

function parseRefSelectors(raw: string): string[] {
	return raw
		.split(",")
		.map((token) => token.trim())
		.filter(Boolean)
		.map((token) =>
			token.toLowerCase().startsWith("ref:")
				? token.slice("ref:".length).trim()
				: token,
		);
}

const remarkCitation: Plugin<[], Root> = () => {
	return (tree: Root) => {
		visit(tree, (rawNode, index, parent) => {
			if (!parent || typeof index !== "number") return;
			const node = rawNode as TextDirectiveNode;
			if (node.type !== "textDirective") return;
			const name = typeof node.name === "string" ? node.name.trim() : "";
			if (!name) return;

			if (name === "cite") {
				const ids = parseCitationIds(directiveLabel(node));
				if (ids.length === 0) return;
				const citeNode: CiteNode = {
					type: "cite",
					data: {
						hName: "cite",
						hProperties: {
							"data-cite-ids": ids.join(","),
						},
					},
					children: [{ type: "text", value: `[${ids.join(", ")}]` }],
				};
				parent.children.splice(
					index,
					1,
					citeNode as unknown as PhrasingContent,
				);
				return index + 1;
			}

			if (name === "ref") {
				const selectors = parseRefSelectors(directiveLabel(node));
				if (selectors.length === 0) return;
				const nextNodes: PhrasingContent[] = [];
				selectors.forEach((selector, selectorIndex) => {
					const refNode: RefNode = {
						type: "xref",
						data: {
							hName: "span",
							hProperties: {
								"data-ref-id": selector,
							},
						},
						children: [{ type: "text", value: `:ref[${selector}]` }],
					};
					nextNodes.push(refNode as unknown as PhrasingContent);
					if (selectorIndex < selectors.length - 1) {
						nextNodes.push({
							type: "text",
							value: ", ",
						} as PhrasingContent);
					}
				});
				parent.children.splice(index, 1, ...nextNodes);
				return index + nextNodes.length;
			}
		});
	};
};

export const citationParserPlugin: PluginDefinition = {
	id: "citation-parser",
	name: "Inline Directive Parser",
	category: "parser",
	kind: "text",
	autocomplete: true,
	hooks: {
		parse: remarkCitation,
	},
};
