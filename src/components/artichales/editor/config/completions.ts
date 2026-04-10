import { completeFromList } from "@codemirror/autocomplete";
import { StreamLanguage } from "@codemirror/language";
import type { EditorCompletions } from "@/types/editor";

export const BIBTEX_LANGUAGE = StreamLanguage.define({
	startState: () => ({}),
	token: (stream) => {
		if (stream.eatSpace()) return null;
		if (stream.match(/^@[a-zA-Z]+/)) return "keyword";
		if (stream.match(/^[a-zA-Z_][\w-]*/)) return "variableName";
		if (stream.match(/^"([^"\\]|\\.)*"/)) return "string";
		if (stream.match(/^[{}=,]/)) return "punctuation";
		stream.next();
		return null;
	},
});

export function buildTemplateCompletions() {
	return completeFromList([
		{ label: "version", type: "property" },
		{ label: "publisher", type: "property" },
		{ label: "default", type: "property" },
		{ label: "print", type: "property" },
		{ label: "web", type: "property" },
		{ label: "plugins", type: "property" },
		{ label: "citationStyle", type: "property" },
		{ label: "assets", type: "property" },
		{ label: "maxFileSize", type: "property" },
	]);
}

export function buildBibliographyCompletions() {
	return completeFromList([
		{ label: "@article{", type: "keyword" },
		{ label: "@book{", type: "keyword" },
		{ label: "@proceedings{", type: "keyword" },
		{ label: "@online{", type: "keyword" },
		{ label: "author =", type: "property" },
		{ label: "title =", type: "property" },
		{ label: "year =", type: "property" },
		{ label: "url =", type: "property" },
		{ label: "accessed =", type: "property" },
	]);
}

export function buildArticleCompletions(completions: EditorCompletions) {
	const refOptions = completions.referenceSelectors.map((selector) => ({
		label: `[ref:${selector}]`,
		type: "variable",
	}));
	const citeOptions = completions.bibKeys.map((key) => ({
		label: `[cite:${key}]`,
		type: "variable",
	}));

	return completeFromList([
		{ label: "---", type: "keyword" },
		{ label: "title:", type: "property" },
		{ label: "authors:", type: "property" },
		{ label: "keywords:", type: "property" },
		{ label: "[cite:]", type: "keyword" },
		{ label: "[ref:type:key]", type: "keyword" },
		{ label: "[ref:type]", type: "keyword" },
		{ label: "[caption:type:key]", type: "keyword" },
		{ label: "[caption:type:key](Title)", type: "keyword" },
		{ label: ":::abstract", type: "keyword" },
		{ label: ":::plotty[data.json]", type: "keyword" },
		{ label: ":::datatable[data.json]", type: "keyword" },
		...refOptions,
		...citeOptions,
	]);
}

