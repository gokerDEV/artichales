import type { Root } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { z } from "zod";
import { normalizeDirectiveNode } from "./directive-parser.utils";
import type { PluginDefinition } from "./plugin.contract";
type UnknownRecord = Record<string, unknown>;

export const datatableParserPlugin: PluginDefinition = {
	id: "datatable-parser",
	category: "parser",
	directiveCategory: "table",
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

			normalizeDirectiveNode(directive, "datatable");
		});
	};
};

datatableParserPlugin.hooks.parse = remarkDatatable;
