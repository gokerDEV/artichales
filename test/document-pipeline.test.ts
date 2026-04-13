import { describe, expect, test } from "bun:test";
import { runDocumentPipeline } from "@/lib/document-pipeline";

const VALID_BIB = `@article{knuth1984,
  author = {Donald E. Knuth},
  title = {Literate Programming},
  journal = {Comput. J.},
  year = {1984}
}

@article{lamport1994,
  author = {Leslie Lamport},
  title = {LaTeX},
  journal = {Addison-Wesley},
  year = {1994}
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

describe("document pipeline migration conformance (split architecture)", () => {
	test("exposes split parse outputs and removes legacy merged fields", () => {
		const result = runDocumentPipeline(createWorkspace("Body."), "print");

		expect(result.template).toBeDefined();
		expect(result.bibliography).toBeDefined();
		expect(result.article).toBeDefined();
		expect("resolvedReferences" in (result as Record<string, unknown>)).toBe(
			false,
		);
		expect("plots" in (result as Record<string, unknown>)).toBe(false);
		expect("content" in (result as Record<string, unknown>)).toBe(false);
		expect("captions" in (result as Record<string, unknown>)).toBe(false);
	});

	test("resolves enabled plugins from template only (frontmatter cannot enable plugins)", () => {
		const files = createWorkspace(`---
title: "Plugin source test"
plugins:
  plotty: {}
---
Body.`);
		const result = runDocumentPipeline(files, "web");
		expect(result.template.enabledPluginIds.includes("plotty")).toBe(true);
		expect(
			result.article.diagnostics.some(
				(diag) => diag.code === "article-frontmatter-schema-invalid",
			),
		).toBe(true);
	});

	test("keeps bibliography parse output separate from article parse output", () => {
		const result = runDocumentPipeline(createWorkspace("Body."), "print");
		expect(Object.keys(result.bibliography.entriesById).length).toBe(2);
		expect(result.article.citations.length).toBe(0);
	});

	test("collects citation usage in first-appearance order from article AST", () => {
		const files = createWorkspace(`Body [cite:knuth1984], then [cite:lamport1994], then [cite:knuth1984].`);
		const result = runDocumentPipeline(files, "web");
		expect(result.article.citations).toEqual(["knuth1984", "lamport1994"]);
	});

	test("computes heading numbering during single article indexing pass", () => {
		const files = createWorkspace(`:::section[intro]
Intro
:::

:::subsection[scope]
Scope
:::

:::subsubsection[details]
Details
:::`);
		const result = runDocumentPipeline(files, "web");
		expect(result.article.headings).toEqual([
			expect.objectContaining({ id: "section:intro", number: "1", level: 1 }),
			expect.objectContaining({
				id: "subsection:scope",
				number: "1.1",
				level: 2,
				parentId: "section:intro",
			}),
			expect.objectContaining({
				id: "subsubsection:details",
				number: "1.1.1",
				level: 3,
				parentId: "subsection:scope",
			}),
		]);
	});

	test("emits diagnostics for invalid heading hierarchy", () => {
		const files = createWorkspace(`:::subsection[orphan]
No parent section
:::`);
		const result = runDocumentPipeline(files, "web");
		expect(
			result.article.diagnostics.some(
				(diag) => diag.code === "article-heading-parent-missing",
			),
		).toBe(true);
	});

	test("replaces captions/referenceTargets parse output with minimal labeledBlocks", () => {
		const files = createWorkspace(`:::plotty[plot_1.json]
Plot
:::

:::datatable[table_1.json]
Table
:::

:::plotty[plot_2.json]
Plot 2
:::
`);
		const result = runDocumentPipeline(files, "print");
		expect(result.article.labeledBlocks).toEqual([
			expect.objectContaining({ id: "plotty:plot_1", number: 1 }),
			expect.objectContaining({ id: "datatable:table_1", number: 1 }),
			expect.objectContaining({ id: "plotty:plot_2", number: 2 }),
		]);
	});

	test("rejects unsupported frontmatter keys with typed schema", () => {
		const files = createWorkspace(`---
title: "Bad frontmatter"
references:
  - source: "./refs.bib"
---
Body.`);
		const result = runDocumentPipeline(files, "print");
		expect(
			result.article.diagnostics.some(
				(diag) =>
					diag.code === "article-frontmatter-schema-invalid" &&
					diag.severity === "error",
			),
		).toBe(true);
	});
});
