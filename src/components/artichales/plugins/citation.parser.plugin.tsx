import type { LinkReference, Parent, PhrasingContent, Root, Text } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

export const citationParserPlugin = {
	id: "citation-parser",
	kind: "parser",
	name: "Citation Parser",
};

export interface CitationNode extends Parent {
	type: "cite";
	data: {
		hName: "cite";
		hProperties: {
			"data-cite-id": string;
		};
	};
}

export interface CrossRefNode extends Parent {
	type: "xref";
	data: {
		hName: "span";
		hProperties: {
			"data-ref-id": string;
		};
	};
}

type UnknownParentNode = {
	children: unknown[];
};

function hasChildren(node: unknown): node is UnknownParentNode {
	return (
		typeof node === "object" &&
		node !== null &&
		Array.isArray((node as { children?: unknown }).children)
	);
}

function parseIds(raw: string): string[] {
	return raw
		.split(",")
		.map((id: string) => id.trim())
		.filter(Boolean);
}

function parseTokenLabel(
	label: string,
): { kind: "cite" | "ref"; value: string } | null {
	const match = label.match(/^(cite|ref)\s*:\s*(.+)$/i);
	if (!match) return null;
	const kind = match[1].toLowerCase() as "cite" | "ref";
	const value = match[2].trim();
	if (!value) return null;
	return { kind, value };
}

export const remarkCitation: Plugin<[], Root> = () => {
	return (tree: Root) => {
		// PRE-PASS: Heal AST fractured by `remark-directive`
		// `remark-directive` can shred `[cite:knuth1984]` / `[ref:plot_1]` into broken text nodes.
		visit(tree, (node: unknown) => {
			if (!hasChildren(node)) return;

			let i = 0;
			while (i < node.children.length - 2) {
				const child = node.children[i];
				const next = node.children[i + 1];
				const nextNext = node.children[i + 2];
				if (
					typeof child !== "object" ||
					child === null ||
					typeof next !== "object" ||
					next === null ||
					typeof nextNext !== "object" ||
					nextNext === null
				) {
					i++;
					continue;
				}

				const childNode = child as { type?: string; value?: string };
				const nextNode = next as { type?: string; name?: string };
				const nextNextNode = nextNext as { type?: string; value?: string };

				if (
					childNode.type === "text" &&
					typeof childNode.value === "string" &&
					/\[(cite|ref)\s*$/i.test(childNode.value) &&
					nextNode.type === "textDirective" &&
					nextNextNode.type === "text" &&
					typeof nextNode.name === "string" &&
					typeof nextNextNode.value === "string"
				) {
					const endBracketIndex = nextNextNode.value.indexOf("]");
					if (endBracketIndex !== -1) {
						const trailingTokenMatch = childNode.value.match(
							/^(.*)\[(cite|ref)\s*$/i,
						);
						if (!trailingTokenMatch) {
							i++;
							continue;
						}
						const prefix = trailingTokenMatch[1] || "";
						const tokenKind = trailingTokenMatch[2].toLowerCase();

						const tokenStr =
							`[${tokenKind}:` +
							nextNode.name +
							nextNextNode.value.slice(0, endBracketIndex + 1);

						// Keep any trailing text after `]`
						const endVal = nextNextNode.value.slice(endBracketIndex + 1);

						const mergedText: Text = {
							type: "text",
							value: prefix + tokenStr + endVal,
						};

						node.children.splice(i, 3, mergedText);
						// Do not increment `i` here because the newly mergedText at `i`
						// could potentially be the start node for the IMMEDIATE next directive chunk!
						continue;
					}
				}
				i++;
			}
		});

		// Handle cases where remark misinterprets [cite:id] (without space) as a link reference
		visit(
			tree,
			"linkReference",
			(node: LinkReference, index?: number, parent?: Parent) => {
				const label = node.label || "";
				const parsedLabel = parseTokenLabel(label);
				if (!parsedLabel || !parent || typeof index !== "number") {
					return undefined;
				}

				if (parsedLabel.kind === "cite") {
					const ids = parseIds(parsedLabel.value);
					if (ids.length === 0) return undefined;

					const replacementNodes: PhrasingContent[] = [];
					ids.forEach((id, idx) => {
						const citeNode: CitationNode = {
							type: "cite",
							data: {
								hName: "cite",
								hProperties: {
									"data-cite-id": id,
								},
							},
							children: [{ type: "text", value: `[${id}]` }],
						};
						replacementNodes.push(citeNode as unknown as PhrasingContent);
						if (idx < ids.length - 1) {
							replacementNodes.push({
								type: "text",
								value: ", ",
							} as PhrasingContent);
						}
					});
					parent.children.splice(index, 1, ...replacementNodes);
					return index + replacementNodes.length;
				}

				const refNode: CrossRefNode = {
					type: "xref",
					data: {
						hName: "span",
						hProperties: {
							"data-ref-id": parsedLabel.value,
						},
					},
					children: [{ type: "text", value: `[ref:${parsedLabel.value}]` }],
				};
				parent.children.splice(index, 1, refNode as unknown as PhrasingContent);
				return index + 1;
			},
		);

		visit(tree, "text", (node: Text, index?: number, parent?: Parent) => {
			if (!node.value) return;

			const tokenRegex = /\[(cite|ref)\s*:\s*([^\]]+)\]/g;
			if (!tokenRegex.test(node.value)) return;

			tokenRegex.lastIndex = 0;
			let match: RegExpExecArray | null = null;
			let lastIndex = 0;
			const newNodes: Array<Text | CitationNode | CrossRefNode> = [];

			while (true) {
				match = tokenRegex.exec(node.value);
				if (match === null) break;

				if (match.index > lastIndex) {
					newNodes.push({
						type: "text",
						value: node.value.slice(lastIndex, match.index),
					});
				}

				const tokenKind = match[1];
				const rawValue = match[2];
				if (tokenKind === "cite") {
					const ids = parseIds(rawValue);
					ids.forEach((id, idx) => {
						newNodes.push({
							type: "cite",
							data: {
								hName: "cite",
								hProperties: {
									"data-cite-id": id,
								},
							},
							children: [{ type: "text", value: `[${id}]` }],
						});
						if (idx < ids.length - 1) {
							newNodes.push({
								type: "text",
								value: ", ",
							});
						}
					});
				} else if (tokenKind === "ref") {
					const refId = rawValue.trim();
					if (refId) {
						newNodes.push({
							type: "xref",
							data: {
								hName: "span",
								hProperties: {
									"data-ref-id": refId,
								},
							},
							children: [{ type: "text", value: `[ref:${refId}]` }],
						});
					}
				}

				lastIndex = tokenRegex.lastIndex;
			}

			if (lastIndex < node.value.length) {
				newNodes.push({
					type: "text",
					value: node.value.slice(lastIndex),
				});
			}

			if (newNodes.length > 0 && parent && typeof index === "number") {
				parent.children.splice(
					index,
					1,
					...(newNodes as unknown as PhrasingContent[]),
				);
				return index + newNodes.length;
			}

			return undefined;
		});
	};
};
