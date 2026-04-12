import type {
	Link,
	LinkReference,
	Parent,
	PhrasingContent,
	Root,
	Text,
} from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import type { PluginDefinition } from "./plugin.contract";

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
			"data-ref-id"?: string;
			"data-caption-type"?: string;
			"data-caption-key"?: string;
			"data-caption-title"?: string;
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
	const normalizeId = (id: string): string => {
		const trimmed = id.trim();
		const tokenized = trimmed.match(/^cite\s*:\s*(.+)$/i);
		return tokenized ? tokenized[1].trim() : trimmed;
	};

	return raw.split(",").map(normalizeId).filter(Boolean);
}

function parseRefSelectors(raw: string): string[] {
	return raw
		.split(",")
		.map((segment) => segment.trim())
		.map((segment) =>
			segment.toLowerCase().startsWith("ref:")
				? segment.slice("ref:".length).trim()
				: segment,
		)
		.map((segment) =>
			segment
				.split(":")
				.map((part) => part.trim())
				.filter(Boolean)
				.join(":"),
		)
		.filter(Boolean);
}

function parseTokenLabel(
	label: string,
): { kind: "cite" | "ref" | "caption"; value: string } | null {
	const match = label.match(/^(cite|ref|caption)\s*:\s*(.+)$/i);
	if (!match) return null;
	const kind = match[1].toLowerCase() as "cite" | "ref" | "caption";
	const value = match[2].trim();
	if (!value) return null;
	return { kind, value };
}

function parseCaptionPayload(
	value: string,
	inlineTitle?: string,
): { type: string; key: string; title?: string } | null {
	const match = value.match(/^([^:\s]+)\s*:\s*([^\s]+)$/);
	if (!match) return null;
	const type = match[1].trim();
	const key = match[2].trim();
	const title = typeof inlineTitle === "string" ? inlineTitle.trim() : "";
	if (!type || !key) return null;
	return { type, key, title: title || undefined };
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

				if (parsedLabel.kind === "caption") {
					const caption = parseCaptionPayload(parsedLabel.value);
					if (!caption) return undefined;
					const captionNode: CrossRefNode = {
						type: "xref",
						data: {
							hName: "span",
							hProperties: {
								"data-caption-type": caption.type,
								"data-caption-key": caption.key,
								...(caption.title
									? { "data-caption-title": caption.title }
									: {}),
							},
						},
						children: [
							{
								type: "text",
								value: `[caption:${caption.type}:${caption.key}]`,
							},
						],
					};
					parent.children.splice(
						index,
						1,
						captionNode as unknown as PhrasingContent,
					);
					return index + 1;
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
				const selectors = parseRefSelectors(parsedLabel.value);
				if (selectors.length <= 1) {
					parent.children.splice(
						index,
						1,
						refNode as unknown as PhrasingContent,
					);
					return index + 1;
				}
				const replacementNodes: PhrasingContent[] = [];
				selectors.forEach((selector, idx) => {
					replacementNodes.push({
						type: "xref",
						data: {
							hName: "span",
							hProperties: {
								"data-ref-id": selector,
							},
						},
						children: [{ type: "text", value: `[ref:${selector}]` }],
					} as unknown as PhrasingContent);
					if (idx < selectors.length - 1) {
						replacementNodes.push({
							type: "text",
							value: ", ",
						} as PhrasingContent);
					}
				});
				parent.children.splice(index, 1, ...replacementNodes);
				return index + replacementNodes.length;
			},
		);

		visit(tree, "link", (node: Link, index?: number, parent?: Parent) => {
			if (!parent || typeof index !== "number") return;
			if (!Array.isArray(node.children) || node.children.length !== 1) return;
			const first = node.children[0];
			if (!first || first.type !== "text") return;
			const parsedLabel = parseTokenLabel(first.value || "");
			if (!parsedLabel) return;

			if (parsedLabel.kind === "caption") {
				const caption = parseCaptionPayload(parsedLabel.value, node.url || "");
				if (!caption) return;
				parent.children.splice(index, 1, {
					type: "xref",
					data: {
						hName: "span",
						hProperties: {
							"data-caption-type": caption.type,
							"data-caption-key": caption.key,
							...(caption.title ? { "data-caption-title": caption.title } : {}),
						},
					},
					children: [
						{
							type: "text",
							value: `[caption:${caption.type}:${caption.key}]`,
						},
					],
				} as unknown as PhrasingContent);
				return index + 1;
			}

			if (parsedLabel.kind === "ref") {
				const selectors = parseRefSelectors(parsedLabel.value);
				if (selectors.length === 0) return;
				const nodes: PhrasingContent[] = [];
				selectors.forEach((selector, idx) => {
					nodes.push({
						type: "xref",
						data: {
							hName: "span",
							hProperties: {
								"data-ref-id": selector,
							},
						},
						children: [{ type: "text", value: `[ref:${selector}]` }],
					} as unknown as PhrasingContent);
					if (idx < selectors.length - 1) {
						nodes.push({ type: "text", value: ", " } as PhrasingContent);
					}
				});
				parent.children.splice(index, 1, ...nodes);
				return index + nodes.length;
			}

			if (parsedLabel.kind === "cite") {
				const ids = parseIds(parsedLabel.value);
				if (ids.length === 0) return;
				const nodes: PhrasingContent[] = [];
				ids.forEach((id, idx) => {
					nodes.push({
						type: "cite",
						data: {
							hName: "cite",
							hProperties: {
								"data-cite-id": id,
							},
						},
						children: [{ type: "text", value: `[${id}]` }],
					} as unknown as PhrasingContent);
					if (idx < ids.length - 1) {
						nodes.push({ type: "text", value: ", " } as PhrasingContent);
					}
				});
				parent.children.splice(index, 1, ...nodes);
				return index + nodes.length;
			}
		});

		visit(tree, "text", (node: Text, index?: number, parent?: Parent) => {
			if (!node.value) return;

			const tokenRegex =
				/\[(cite|ref|caption)\s*:\s*([^\]]+)\](?:\(([^)]+)\))?/g;
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
				const inlineTitle =
					typeof match[3] === "string" ? match[3].trim() : undefined;
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
					const selectors = parseRefSelectors(rawValue);
					selectors.forEach((selector, idx) => {
						newNodes.push({
							type: "xref",
							data: {
								hName: "span",
								hProperties: {
									"data-ref-id": selector,
								},
							},
							children: [{ type: "text", value: `[ref:${selector}]` }],
						});
						if (idx < selectors.length - 1) {
							newNodes.push({
								type: "text",
								value: ", ",
							});
						}
					});
				} else if (tokenKind === "caption") {
					const caption = parseCaptionPayload(rawValue, inlineTitle);
					if (caption) {
						newNodes.push({
							type: "xref",
							data: {
								hName: "span",
								hProperties: {
									"data-caption-type": caption.type,
									"data-caption-key": caption.key,
									...(caption.title
										? { "data-caption-title": caption.title }
										: {}),
								},
							},
							children: [
								{
									type: "text",
									value: `[caption:${caption.type}:${caption.key}]`,
								},
							],
						});
					} else {
						newNodes.push({
							type: "text",
							value: match[0],
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

export const citationParserPlugin: PluginDefinition = {
	id: "citation-parser",
	category: "parser",
	name: "Citation Parser",
	hooks: {
		parse: remarkCitation,
	},
};
