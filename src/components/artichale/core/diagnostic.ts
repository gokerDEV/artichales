import type { ParseDiagnostic } from "@/components/artichale/types/pipeline.types";
import type { RenderDiagnostic } from "@/components/artichale/types/render.types";

type Position = {
	offset?: number;
	line?: number;
	column?: number;
};

export function createParseDiagnostic(
	diagnostic: Omit<ParseDiagnostic, "source">,
	position?: Position,
): ParseDiagnostic {
	return {
		source: "parser",
		...diagnostic,
		...position,
	};
}

export function createRenderDiagnostic(
	diagnostic: Omit<RenderDiagnostic, "source">,
): RenderDiagnostic {
	return {
		source: "render",
		...diagnostic,
	};
}

export function createPluginRenderDiagnostic(
	diagnostic: Omit<RenderDiagnostic, "source">,
): RenderDiagnostic {
	return {
		source: "plugin",
		...diagnostic,
	};
}
