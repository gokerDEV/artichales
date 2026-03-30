import type { Root } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

export const abstractParserPlugin = {
	id: "abstract-parser",
	kind: "parser",
	name: "Abstract Parser",
};

export const remarkAbstract: Plugin<[], Root> = () => {
	return (tree: Root) => {
		visit(tree, (node: unknown) => {
			const n = node as Record<string, unknown>;
			if (
				n.type === "containerDirective" ||
				n.type === "leafDirective" ||
				n.type === "textDirective"
			) {
				if (n.name === "abstract") {
					const data = (n.data as Record<string, unknown>) || {};
					n.data = data;
					data.hName = "div";
					data.hProperties = {
						...(data.hProperties as Record<string, unknown>),
						"data-directive": "abstract",
					};
				}
			}
		});
	};
};
