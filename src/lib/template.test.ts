import { describe, expect, test } from "bun:test";
import { loadPluginRegistry } from "@/components/artichales/plugins/plugin.registry";
import { resolveTemplateFile } from "./template";

describe("template merge behavior", () => {
	test("appends plugin arrays and allows last occurrence to override enable state", () => {
		const resolved = resolveTemplateFile(
			JSON.stringify({
				plugins: [
					{ id: "citation-parser", enabled: false },
					{ id: "plotty-parser", enabled: false },
					{ id: "plotty-parser", enabled: true },
				],
			}),
		);

		expect(resolved.hasError).toBe(false);
		const pluginIds = loadPluginRegistry(resolved.template.plugins).map(
			(plugin) => plugin.id,
		);
		expect(pluginIds.includes("citation-parser")).toBe(false);
		expect(pluginIds.includes("plotty-parser")).toBe(true);
	});

	test("rejects unsupported citationStyle values", () => {
		const resolved = resolveTemplateFile(
			JSON.stringify({
				default: {
					citationStyle: "author-year",
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
