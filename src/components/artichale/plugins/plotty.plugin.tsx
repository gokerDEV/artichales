import * as React from "react";
import {
	resolveBlockSpacingStyle,
	resolveComponentConfig,
	resolveFlowSpan,
} from "@/components/artichale/base/plugin.shared.ts";
import { parseDirectiveNode } from "@/components/artichale/core/artichale.util";
import type { PluginDefinition } from "@/components/artichale/types/plugin.types";
import {
	DirectiveKind,
	DisplayAs,
} from "@/components/artichale/types/plugin.types";

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

function resolvePlotDefinition(raw: unknown): PlotDefinition | null {
	if (!isRecord(raw) || !Array.isArray(raw.data)) return null;
	return {
		data: raw.data.filter((trace): trace is PlotTrace => isRecord(trace)),
		layout: isRecord(raw.layout) ? raw.layout : {},
		config: isRecord(raw.config) ? raw.config : {},
	};
}

function PlottyChart({
	plot,
	lastModified,
}: {
	plot: PlotDefinition;
	lastModified?: number;
}) {
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
			data-last-modified={lastModified}
			style={{
				height: height ? `${height}px` : "520px",
				maxWidth: width ? `${width}px` : "100%",
			}}
		/>
	);
}

const MemoizedPlottyChart = React.memo(
	PlottyChart,
	(previousProps, nextProps) =>
		previousProps.lastModified === nextProps.lastModified,
);

export const plottyPlugin: PluginDefinition = {
	id: "plotty",
	name: "Plotty",
	displayAs: DisplayAs.FIGURE,
	kind: DirectiveKind.CONTAINER,
	autocomplete: true,
	async render({ node, fnJSONAssetReader, template, target }) {
		const parsed = parseDirectiveNode(node);
		const source = parsed.dataFile || parsed.label;
		const loaded = source
			? await fnJSONAssetReader?.<unknown>(source).catch(() => null)
			: null;
		const plot = resolvePlotDefinition(loaded?.data);
		const config = resolveComponentConfig(template, "figure");
		const fallbackSpan = config.defaultSpan === "page" ? "page" : "column";
		const span = resolveFlowSpan(node, fallbackSpan);

		return (
			<figure
				className="art-figure"
				data-flow-span={span}
				style={resolveBlockSpacingStyle(config)}
			>
				{plot ? (
					<MemoizedPlottyChart
						plot={plot}
						lastModified={loaded?.lastModified}
					/>
				) : (
					<div className="p-3 text-center text-sm">
						Unable to load plot data from{" "}
						<strong>{source || "(missing source)"}</strong>.
					</div>
				)}
			</figure>
		);
	},
};
