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
			"data-cite-ids": string;
		};
	};
}

export const remarkCitation: Plugin<[], Root> = () => {
	return (tree: Root) => {
		// PRE-PASS: Heal AST fractured by `remark-directive`
		// `remark-directive` mistakenly shreds `[cite:knuth1984]` into `text("[cite")`, `textDirective(knuth1984)`, `text("]")`
		visit(tree, (node: any) => {
			if (!node.children || !Array.isArray(node.children)) return;

			let i = 0;
			while (i < node.children.length - 2) {
				const child = node.children[i];
				const next = node.children[i + 1];
				const nextNext = node.children[i + 2];

				if (
					child.type === "text" &&
					child.value.endsWith("[cite") &&
					next.type === "textDirective" &&
					nextNext.type === "text"
				) {
					const endBracketIndex = nextNext.value.indexOf("]");
					if (endBracketIndex !== -1) {
						// Slice out the trailing `[cite` from the start node
						const startVal = child.value.slice(0, -5);

						// Reconstruct the citation literal
						const citeStr =
							"[cite:" +
							next.name +
							nextNext.value.slice(0, endBracketIndex + 1);

						// Keep any trailing text after `]`
						const endVal = nextNext.value.slice(endBracketIndex + 1);

						const mergedText: Text = {
							type: "text",
							value: startVal + citeStr + endVal,
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
				if (node.label?.startsWith("cite:")) {
					const idsString = node.label.replace("cite:", "");
					const ids = idsString
						.split(",")
						.map((id: string) => id.trim())
						.filter(Boolean);

					if (ids.length > 0 && parent && typeof index === "number") {
						const citeNode: CitationNode = {
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
				}
				return undefined;
			},
		);

		visit(tree, "text", (node: Text, index?: number, parent?: Parent) => {
			if (!node.value) return;

			const citeRegex = /\[cite:([^\]]+)\]/g;
			if (!citeRegex.test(node.value)) return;

			citeRegex.lastIndex = 0;
			let match: RegExpExecArray | null = null;
			let lastIndex = 0;
			const newNodes: Array<Text | CitationNode> = [];

			while (true) {
				match = citeRegex.exec(node.value);
				if (match === null) break;

				if (match.index > lastIndex) {
					newNodes.push({
						type: "text",
						value: node.value.slice(lastIndex, match.index),
					});
				}

				const ids = match[1]
					.split(",")
					.map((id: string) => id.trim())
					.filter(Boolean);

				newNodes.push({
					// Use 'element' directly or let unified map it via data.hName
					type: "cite",
					data: {
						hName: "cite",
						hProperties: {
							"data-cite-ids": ids.join(","),
						},
					},
					children: [{ type: "text", value: `[${ids.join(", ")}]` }],
				});

				lastIndex = citeRegex.lastIndex;
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
