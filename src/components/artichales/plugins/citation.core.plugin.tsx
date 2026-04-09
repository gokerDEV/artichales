import { z } from "zod";
import type { PluginDefinition } from "./plugin.contract";

export const citationCorePlugin: PluginDefinition = {
	id: "citation-core",
	category: "core",
	name: "Citation Core",
	configSchema: z
		.object({
			collapseRanges: z.boolean().optional(),
			styleOverride: z.enum(["numeric", "ieee", "apc"]).optional(),
		})
		.strict(),
	hooks: {},
};
