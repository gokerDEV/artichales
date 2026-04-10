import { describe, expect, test } from "bun:test";
import { citationParserPlugin } from "@/components/artichales/plugins/citation.parser.plugin";
import { runDocumentPipeline } from "./document-pipeline";

const VALID_BIB = `@article{knuth1984,
  author = {Donald E. Knuth},
  title = {Literate Programming},
  journal = {Comput. J.},
  year = {1984}
}`;

function createWorkspace(
	article: string,
	references = VALID_BIB,
	template = "{}",
) {
	const articleWithFrontmatter = article.startsWith("---\n")
		? article
		: `---
title: "Test"
---
${article}`;

	return {
		"template.json": template,
		"article.mda": articleWithFrontmatter,
		"references.bib": references,
	};
}

describe("document pipeline migration conformance", () => {
	test("accepts valid singleton short reference [ref:abstract]", () => {
		const files = createWorkspace(`:::abstract
Abstract body
:::

See [ref:abstract].`);
		const result = runDocumentPipeline(files, "print");
		const hasError = result.articleDiagnostics.some(
			(diag) => diag.severity === "error",
		);

		if (hasError) console.error(result.articleDiagnostics);
		expect(hasError).toBe(false);
		expect(result.resolvedReferences.abstract?.label).toBe("Abstract");
	});

	test("rejects ambiguous short reference [ref:abstract]", () => {
		const files = createWorkspace(`:::abstract
A
:::

:::abstract[data.json]
B
:::

:::abstract
C
:::

See [ref:abstract].`);
		const result = runDocumentPipeline(files, "print");
		const ambiguousDiag = result.articleDiagnostics.find(
			(diag) =>
				diag.code === "article-ref-short-ambiguous-unkeyed-target" &&
				diag.severity === "error",
		);

		expect(ambiguousDiag).toBeDefined();
	});

	test("rejects duplicate directive identity", () => {
		const files = createWorkspace(`:::plotty[data.json]
One
:::

:::plotty[data.json]
Two
:::
`);
		const result = runDocumentPipeline(files, "print");
		const duplicateDirective = result.articleDiagnostics.find(
			(diag) =>
				diag.code === "article-directive-identity-duplicate" &&
				diag.severity === "error",
		);

		expect(duplicateDirective).toBeDefined();
	});

	test("rejects duplicate BibTeX keys", () => {
		const duplicateBib = `@article{dupkey,
  author = {A},
  title = {T1},
  journal = {J},
  year = {2024}
}

@article{dupkey,
  author = {B},
  title = {T2},
  journal = {J},
  year = {2025}
}`;
		const files = createWorkspace("Simple text.", duplicateBib);
		const result = runDocumentPipeline(files, "print");
		const duplicateBibDiag = result.bibDiagnostics.find(
			(diag) =>
				diag.code === "bibtex-duplicate-key" && diag.severity === "error",
		);

		expect(duplicateBibDiag).toBeDefined();
	});

	test("marks invalid template schema as blocking", () => {
		const invalidTemplate = JSON.stringify({
			default: {
				assets: {
					maxFileSize: "not-a-number",
				},
			},
		});
		const files = createWorkspace("Simple text.", VALID_BIB, invalidTemplate);
		const result = runDocumentPipeline(files, "print");
		const templateSchemaError = result.templateDiagnostics.find(
			(diag) =>
				diag.code === "template-schema-invalid" && diag.severity === "error",
		);

		expect(templateSchemaError).toBeDefined();
	});

	test("raises plugin config map validation error when frontmatter plugins is not an object", () => {
		const files = createWorkspace(`---
title: "Invalid plugins map"
plugins:
  - bad
---
Body.`);
		const result = runDocumentPipeline(files, "print");
		const pluginMapError = result.articleDiagnostics.find(
			(diag) =>
				diag.code === "plugin-config-map-invalid" && diag.severity === "error",
		);

		expect(pluginMapError).toBeDefined();
	});

	test("marks missing frontmatter as blocking", () => {
		const files = {
			"template.json": "{}",
			"article.mda": "No frontmatter body text.",
			"references.bib": VALID_BIB,
		};
		const result = runDocumentPipeline(files, "print");
		const missingFrontmatter = result.articleDiagnostics.find(
			(diag) =>
				diag.code === "article-frontmatter-missing" &&
				diag.severity === "error",
		);

		expect(missingFrontmatter).toBeDefined();
	});

	test("marks invalid frontmatter schema as blocking", () => {
		const files = createWorkspace(`---
authors: ["No title field"]
---
Body.`);
		const result = runDocumentPipeline(files, "print");
		const invalidFrontmatter = result.articleDiagnostics.find(
			(diag) =>
				diag.code === "article-frontmatter-schema-invalid" &&
				diag.severity === "error",
		);

		expect(invalidFrontmatter).toBeDefined();
	});

	test("marks footnote syntax as unsupported blocking error", () => {
		const files = createWorkspace(`---
title: "Footnote test"
---
Footnote ref [^n1]

[^n1]: unsupported.`);
		const result = runDocumentPipeline(files, "print");
		const unsupportedFootnote = result.articleDiagnostics.find(
			(diag) =>
				diag.code === "article-footnote-unsupported" &&
				diag.severity === "error",
		);

		expect(unsupportedFootnote).toBeDefined();
	});

	test("attributes parser hook failures to plugin id", () => {
		const originalParseHook = citationParserPlugin.hooks.parse;
		citationParserPlugin.hooks.parse = () => {
			throw new Error("forced parser failure");
		};

		try {
			const files = createWorkspace(`---
title: "Plugin failure test"
---
Body with [cite:knuth1984].`);
			const result = runDocumentPipeline(files, "print");
			const hookFailure = result.articleDiagnostics.find(
				(diag) =>
					diag.code === "plugin-hook-failed" &&
					diag.severity === "error" &&
					diag.pluginId === citationParserPlugin.id,
			);

			expect(hookFailure).toBeDefined();
		} finally {
			citationParserPlugin.hooks.parse = originalParseHook;
		}
	});

	test("falls back to '? n' when reference label mapping is missing", () => {
		const templateWithoutPlottyLabel = JSON.stringify({
			default: {
				referenceLabels: {
					plotty: "",
				},
			},
		});
		const files = createWorkspace(
			`---
title: "Ref label fallback"
---
:::plotty[data.json]
Caption text
:::

See [ref:plotty:data].`,
			VALID_BIB,
			templateWithoutPlottyLabel,
		);

		const result = runDocumentPipeline(files, "print");
		const mapped = result.resolvedReferences["plotty:data"];
		const warning = result.articleDiagnostics.find(
			(diag) => diag.code === "article-ref-label-unmapped",
		);

		expect(mapped?.label).toBe("? 1");
		expect(warning).toBeDefined();
	});

	test("builds reference target completion entries from normalized targets", () => {
		const files = createWorkspace(`---
title: "Completion target registry"
---
:::abstract
Only one abstract
:::

:::plotty[plot_1.json]
Plot block
:::
`);

		const result = runDocumentPipeline(files, "print");
		const selectors = result.referenceTargets.map((entry) => entry.selector);
		expect(selectors.includes("abstract")).toBe(true);
		expect(selectors.includes("plotty:plot_1")).toBe(true);
	});

	test("rejects directives with more than one data file bracket segment", () => {
		const files = createWorkspace(`---
title: "Invalid directive brackets"
---
:::plotty[data.json][extra.json]
Bad
:::
`);
		const result = runDocumentPipeline(files, "print");
		const invalidSegments = result.articleDiagnostics.find(
			(diag) =>
				diag.code === "article-directive-invalid-data-file-segments" &&
				diag.severity === "error",
		);

		expect(invalidSegments).toBeDefined();
	});
});
