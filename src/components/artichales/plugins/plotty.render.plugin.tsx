import * as React from "react";
import type { Components } from "react-markdown";
import { parse as parseYaml } from "yaml";
import { AbstractRender } from "@/components/artichales/plugins/abstract.render.plugin";

type UnknownRecord = Record<string, unknown>;
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

type PlottyChartProps = {
	plot: PlotDefinition;
	width?: number;
	height?: number;
};

function isRecord(value: unknown): value is UnknownRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function toNumber(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value)
		? value
		: undefined;
}

function mergeRecords(
	base: UnknownRecord,
	override: UnknownRecord,
): UnknownRecord {
	const merged: UnknownRecord = { ...base };
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
	layoutOverrideText: string,
): PlotDefinition | null {
	if (!isRecord(rawPlot) || !Array.isArray(rawPlot.data)) {
		return null;
	}

	const baseLayout = isRecord(rawPlot.layout) ? rawPlot.layout : {};
	let parsedLayout: unknown = {};
	try {
		parsedLayout = parseYaml(layoutOverrideText);
	} catch {
		parsedLayout = {};
	}
	const layoutOverride = isRecord(parsedLayout) ? parsedLayout : {};
	const resolvedLayout = mergeRecords(baseLayout, layoutOverride);

	return {
		data: rawPlot.data.filter((item) => isRecord(item)) as PlotTrace[],
		layout: resolvedLayout,
		config: isRecord(rawPlot.config) ? rawPlot.config : {},
	};
}

function getNodeProperty(node: unknown, key: string): unknown {
	if (!isRecord(node) || !isRecord(node.properties)) return undefined;
	const properties = node.properties as UnknownRecord;
	return properties[key];
}

function getDirective(node: unknown): string {
	const directive = getNodeProperty(node, "data-directive");
	return asString(directive);
}

function getPlotSource(node: unknown): string {
	const value =
		getNodeProperty(node, "data-plot-source") ??
		getNodeProperty(node, "dataPlotSource");
	return asString(value);
}

function getPlotLayoutText(node: unknown): string {
	const value =
		getNodeProperty(node, "data-plot-layout") ??
		getNodeProperty(node, "dataPlotLayout");
	return asString(value);
}

function PlottyChart({ plot, width, height }: PlottyChartProps) {
	const rootRef = React.useRef<HTMLDivElement | null>(null);
	const [plotly, setPlotly] = React.useState<PlotlyModule | null>(null);

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
		if (!plotly || !rootRef.current) return;
		void plotly.react(rootRef.current, plot.data, plot.layout, {
			responsive: true,
			displaylogo: false,
			...plot.config,
		});
		return () => {
			if (!rootRef.current) return;
			plotly.purge(rootRef.current);
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

type PlottyDivProps = {
	node?: unknown;
	children?: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children">;

export const plottyRenderPlugin = {
	id: "plotty-render",
	kind: "render",
	name: "Plotty Render",
};

export function createDirectiveDivRender(
	plotFiles: Record<string, unknown>,
): Components["div"] {
	return function DirectiveDivRender({
		node,
		children,
		...rest
	}: PlottyDivProps) {
		const directive = getDirective(node);
		if (directive !== "plotty") {
			if (typeof AbstractRender === "function") {
				return React.createElement(
					AbstractRender as React.ComponentType<PlottyDivProps>,
					{ node, ...rest },
					children,
				);
			}
			return <div {...rest}>{children}</div>;
		}

		const source = getPlotSource(node);
		const layoutText = getPlotLayoutText(node);
		const rawPlot = plotFiles[source];
		const resolvedPlot = resolvePlotDefinition(rawPlot, layoutText);
		const resolvedLayout = resolvedPlot?.layout || {};
		const width = toNumber(resolvedLayout.width);
		const height = toNumber(resolvedLayout.height);

		if (!resolvedPlot) {
			return (
				<div
					{...rest}
					className="rounded-md border border-red-300 bg-red-50 p-3 text-red-700 text-xs"
				>
					Plotty source not found or invalid:{" "}
					<strong>{source || "(empty)"}</strong>
				</div>
			);
		}

		return (
			<div {...rest} className="my-6 overflow-x-auto">
				<PlottyChart plot={resolvedPlot} width={width} height={height} />
			</div>
		);
	};
}
