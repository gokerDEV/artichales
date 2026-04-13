import * as React from "react";
import { useWorkspaceJsonFile } from "@/hooks/use-workspace-json-file";
import { isRecord } from "@/lib/artichales.utils";
import type {
	DirectiveComponentProps,
	DirectiveRendererDefinition,
	PluginDefinition,
	RenderHookContext,
} from "./plugin.contract";

type PlotTrace = Record<string, unknown>;
type PlotLayout = Record<string, unknown>;
type PlotConfig = Record<string, unknown>;

type PlotDefinition = {
	data: PlotTrace[];
	layout?: PlotLayout;
	config?: PlotConfig;
};

type PlotlyModule = {
	react: (
		root: HTMLElement,
		data: PlotTrace[],
		layout?: PlotLayout,
		config?: PlotConfig,
	) => Promise<unknown>;
	purge: (root: HTMLElement) => void;
};

function normalizeDataFileKey(value: string): string {
	return value
		.trim()
		.replace(/\.[^/.]+$/, "")
		.toLowerCase();
}

function resolveFlowSpan(
	spanOptions: string | undefined,
	fallback: "column" | "page" = "column",
): "column" | "page" {
	if (!spanOptions) return fallback;
	const normalized = spanOptions.trim().toLowerCase();
	if (normalized === "page" || /\bspan\s*[:=]\s*page\b/.test(normalized)) {
		return "page";
	}
	if (normalized === "column" || /\bspan\s*[:=]\s*column\b/.test(normalized)) {
		return "column";
	}
	return fallback;
}

function toNumber(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value)
		? value
		: undefined;
}

function mergeRecords(
	base: Record<string, unknown>,
	override: Record<string, unknown>,
): Record<string, unknown> {
	const merged: Record<string, unknown> = { ...base };
	for (const [key, value] of Object.entries(override)) {
		const existing = merged[key];
		if (isRecord(existing) && isRecord(value)) {
			merged[key] = mergeRecords(existing, value);
			continue;
		}
		merged[key] = value;
	}
	return merged;
}

function resolvePlotDefinition(
	rawPlot: unknown,
	raw: string,
): PlotDefinition | null {
	if (!isRecord(rawPlot) || !Array.isArray(rawPlot.data)) return null;
	let override: Record<string, unknown> = {};
	if (raw.trim()) {
		try {
			const parsed = JSON.parse(raw);
			if (isRecord(parsed)) override = parsed;
		} catch {
			// ignore malformed inline override
		}
	}
	const baseLayout = isRecord(rawPlot.layout) ? rawPlot.layout : {};
	return {
		data: rawPlot.data.filter((item) => isRecord(item)) as PlotTrace[],
		layout: mergeRecords(baseLayout, override),
		config: isRecord(rawPlot.config) ? rawPlot.config : {},
	};
}

function PlottyChart({ plot }: { plot: PlotDefinition }) {
	const rootRef = React.useRef<HTMLDivElement | null>(null);
	const [plotly, setPlotly] = React.useState<PlotlyModule | null>(null);
	const width = toNumber(plot.layout?.width);
	const height = toNumber(plot.layout?.height);

	React.useEffect(() => {
		let isMounted = true;
		void import("plotly.js-dist-min").then((module) => {
			if (!isMounted) return;
			setPlotly((module.default ?? module) as PlotlyModule);
		});
		return () => {
			isMounted = false;
		};
	}, []);

	React.useEffect(() => {
		const rootElement = rootRef.current;
		if (!plotly || !rootElement) return;
		void plotly.react(rootElement, plot.data, plot.layout, {
			responsive: true,
			displaylogo: false,
			...plot.config,
		});
		return () => {
			plotly.purge(rootElement);
		};
	}, [plot, plotly]);

	return (
		<div
			ref={rootRef}
			className="w-full"
			style={{
				height: height ? `${height}px` : "520px",
				maxWidth: width ? `${width}px` : "100%",
			}}
		/>
	);
}

const MemoizedPlottyChart = React.memo(PlottyChart);

function PlottyDirectiveRender({
	raw,
	params,
	config,
	...rest
}: DirectiveComponentProps) {
	const dataFile = params.data_file ?? "";
	const { data, lastUpdated } = useWorkspaceJsonFile(dataFile);
	const normalizedKey =
		typeof dataFile === "string" && dataFile.trim() !== ""
			? normalizeDataFileKey(dataFile)
			: "";
	const plot = React.useMemo(
		() => resolvePlotDefinition(data, raw),
		[data, raw],
	);
	const flowSpan = resolveFlowSpan(params.span_options, config.defaultSpan);

	if (!plot) {
		return (
			<div
				{...rest}
				className="rounded-md border border-red-300 bg-red-50 p-3 text-red-700 text-xs"
			>
				Plotty data file not found or invalid:{" "}
				<strong>{params.data_file || "(missing)"}</strong>
			</div>
		);
	}

	return (
		<div
			{...rest}
			id={normalizedKey ? `plot-${normalizedKey}` : undefined}
			className="plotty overflow-x-auto"
			data-flow-span={flowSpan}
			style={{
				marginTop: config.spacingBefore,
				marginBottom: config.spacingAfter,
			}}
		>
			<MemoizedPlottyChart key={lastUpdated ?? undefined} plot={plot} />
		</div>
	);
}

function registerPlottyRenderRuntime(
	_: RenderHookContext,
): DirectiveRendererDefinition {
	return {
		directive: "plotty",
		category: "figure",
		component: PlottyDirectiveRender,
	};
}

export const plottyDirectivePlugin: PluginDefinition = {
	id: "plotty",
	category: "figure",
	name: "Plotty",
	displayAs: "figure",
	kind: "container",
	autocomplete: true,
	hooks: {
		directiveRender: registerPlottyRenderRuntime,
	},
};
