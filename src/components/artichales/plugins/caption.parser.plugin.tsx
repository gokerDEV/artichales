import type { Parent, PhrasingContent, Root, Text } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import type { PluginDefinition } from "./plugin.contract";

export interface CaptionNode extends Parent {
	type: "caption-anchor";
	data: {
		hName: "caption";
		hProperties: {
			"data-caption-type": string;
			"data-caption-key": string;
			"data-caption-title"?: string;
		};
	};
}

function parseCaptionSelector(
	raw: string,
): { type: string; key: string } | null {
	const normalized = raw
		.split(":")
		.map((part) => part.trim())
		.filter(Boolean);
	if (normalized.length < 2) return null;
	const type = normalized[0];
	const key = normalized.slice(1).join(":");
	if (!type || !key) return null;
	return { type, key };
}

export const remarkCaption: Plugin<[], Root> = () => {
	return (tree: Root) => {
		visit(tree, "text", (node: Text, index?: number, parent?: Parent) => {
			if (!node.value) return;

			// Match [caption:type:key](Title)
			const tokenRegex = /\[caption\s*:\s*([^\]]+)\](?:\(([^)]+)\))?/g;
			if (!tokenRegex.test(node.value)) return;

			tokenRegex.lastIndex = 0;
			let match: RegExpExecArray | null = null;
			let lastIndex = 0;
			const newNodes: Array<Text | CaptionNode> = [];

			while (true) {
				match = tokenRegex.exec(node.value);
				if (match === null) break;

				if (match.index > lastIndex) {
					newNodes.push({
						type: "text",
						value: node.value.slice(lastIndex, match.index),
					});
				}

				const rawValue = match[1];
				const captionTitle = (match[2] || "").trim();

				const parsedCaption = parseCaptionSelector(rawValue);
				if (!parsedCaption) {
					newNodes.push({
						type: "text",
						value: match[0],
					});
				} else {
					const captionNode: CaptionNode = {
						type: "caption-anchor",
						data: {
							hName: "caption",
							hProperties: {
								"data-caption-type": parsedCaption.type,
								"data-caption-key": parsedCaption.key,
								...(captionTitle ? { "data-caption-title": captionTitle } : {}),
							},
						},
						children: captionTitle
							? [{ type: "text", value: captionTitle }]
							: [],
					};
					newNodes.push(captionNode);
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

export const captionParserPlugin: PluginDefinition = {
	id: "caption-parser",
	category: "parser",
	name: "Caption Parser",
	hooks: {
		parse: remarkCaption,
	},
};
