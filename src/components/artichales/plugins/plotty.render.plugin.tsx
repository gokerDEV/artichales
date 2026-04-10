import * as React from "react";
import { useDirectiveJsonData } from "@/components/artichales/plugins/directive-data-file";
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
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
	if (!isRecord(rawPlot) || !Array.isArray(rawPlot.data)) {
		return null;
	}
	const override = raw.trim() ? safeParseRecord(raw) : {};
	const baseLayout = isRecord(rawPlot.layout) ? rawPlot.layout : {};
	return {
		data: rawPlot.data.filter((item) => isRecord(item)) as PlotTrace[],
		layout: mergeRecords(baseLayout, override),
		config: isRecord(rawPlot.config) ? rawPlot.config : {},
	};
}

function safeParseRecord(raw: string): Record<string, unknown> {
	try {
		const parsed = JSON.parse(raw);
		return isRecord(parsed) ? parsed : {};
	} catch {
		return {};
	}
}

function PlottyChart({
	plot,
}: {
	plot: PlotDefinition;
}) {
	const rootRef = React.useRef<HTMLDivElement | null>(null);
	const [plotly, setPlotly] = React.useState<PlotlyModule | null>(null);
	const width = toNumber(plot.layout?.width);
	const height = toNumber(plot.layout?.height);

	React.useEffect(() => {
		let isMounted = true;
		void import("plotly.js-dist-min").then((module) => {
			if (!isMounted) return;
			const loaded = (module.default ?? module) as PlotlyModule;
			setPlotly(loaded);
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
	const dataFile = params.data_file;
	const { data } = useDirectiveJsonData<PlotDefinition>(dataFile);
	const plot = React.useMemo(
		() => resolvePlotDefinition(data, raw),
		[data, raw],
	);

	if (!plot) {
		return (
			<div
				{...rest}
				className="rounded-md border border-red-300 bg-red-50 p-3 text-red-700 text-xs"
			>
				Plotty data file not found or invalid:{" "}
				<strong>{dataFile || "(missing)"}</strong>
			</div>
		);
	}

	return (
		<div
			{...rest}
			className="plotty overflow-x-auto"
			data-flow-span={config.defaultSpan}
			style={{
				marginTop: config.spacingBefore,
				marginBottom: config.spacingAfter,
			}}
		>
			<MemoizedPlottyChart plot={plot} />
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

export const plottyRenderPlugin: PluginDefinition = {
	id: "plotty-render",
	category: "render",
	directiveCategory: "figure",
	name: "Plotty Render",
	hooks: {
		directiveRender: registerPlottyRenderRuntime,
	},
};
