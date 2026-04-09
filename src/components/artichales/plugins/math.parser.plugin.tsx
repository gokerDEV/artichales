import type { Root } from "mdast";
import remarkMath from "remark-math";
import type { Plugin } from "unified";
import type { PluginDefinition } from "./plugin.contract";

export const mathParserPlugin: PluginDefinition = {
	id: "math-parser",
	category: "parser",
	name: "Math Parser",
	ownsSyntax: ["equation", "math"],
	hooks: {},
};

export const remarkMathEquation = remarkMath as unknown as Plugin<[], Root>;

mathParserPlugin.hooks.parse = remarkMathEquation;
