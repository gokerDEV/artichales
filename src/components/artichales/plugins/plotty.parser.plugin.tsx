import type { Root } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { z } from "zod";
import { normalizeDirectiveNode } from "./directive-parser.utils";
import type { PluginDefinition } from "./plugin.contract";
type UnknownRecord = Record<string, unknown>;

export const plottyParserPlugin: PluginDefinition = {
	id: "plotty-parser",
	category: "parser",
	directiveCategory: "figure",
	name: "Plotty Parser",
	ownsSyntax: ["plotty"],
	configSchema: z
		.object({
			requireDataFile: z.boolean().optional(),
			defaultSpan: z.enum(["column", "page"]).optional(),
			defaultCaptionPosition: z.enum(["top", "bottom"]).optional(),
		})
		.strict(),
	hooks: {},
};

export const remarkPlotty: Plugin<[], Root> = () => {
	return (tree: Root) => {
		visit(tree, (node: unknown) => {
			const directive = node as UnknownRecord;
			if (
				directive.type !== "containerDirective" ||
				directive.name !== "plotty"
			) {
				return;
			}

			normalizeDirectiveNode(directive, "plotty");
		});
	};
};

plottyParserPlugin.hooks.parse = remarkPlotty;
