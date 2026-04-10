import { describe, expect, test } from "bun:test";
import { resolveRuntimePluginIdsFromTemplate } from "@/components/artichales/plugins/plugin.registry";
import { resolveTemplateFile } from "@/lib/template";

describe("template merge behavior", () => {
	test("accepts directive-only plugin list and keeps system plugins active", () => {
		const resolved = resolveTemplateFile(
			JSON.stringify({
				plugins: ["abstract", "plotty"],
			}),
		);

		expect(resolved.hasError).toBe(false);
		const pluginIds = resolveRuntimePluginIdsFromTemplate(
			resolved.template.plugins,
		);
		expect(pluginIds.includes("citation-parser")).toBe(true);
		expect(pluginIds.includes("plotty-parser")).toBe(true);
		expect(pluginIds.includes("datatable-parser")).toBe(false);
	});

	test("rejects unsupported citationStyle values", () => {
		const resolved = resolveTemplateFile(
			JSON.stringify({
				default: {
					citationStyle: "mla",
				},
			}),
		);

		expect(resolved.hasError).toBe(true);
		expect(
			resolved.diagnostics.some(
				(diag) =>
					diag.code === "template-schema-invalid" && diag.severity === "error",
			),
		).toBe(true);
	});
});
