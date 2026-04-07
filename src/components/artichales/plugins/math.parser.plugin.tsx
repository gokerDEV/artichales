import type { Root } from "mdast";
import remarkMath from "remark-math";
import type { Plugin } from "unified";

export const mathParserPlugin = {
	id: "math-parser",
	kind: "parser",
	name: "Math Parser",
};

export const remarkMathEquation = remarkMath as unknown as Plugin<[], Root>;
