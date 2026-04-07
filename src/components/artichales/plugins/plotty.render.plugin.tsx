import * as React from "react";
import type { Components } from "react-markdown";
import { parse as parseYaml } from "yaml";
import { AbstractRender } from "@/components/artichales/plugins/abstract.render.plugin";
import { DatatableRenderBlock } from "@/components/artichales/plugins/datatable.render.plugin";

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

type PlotOverrideResult = {
	layoutOverride: PlotLayout;
	caption: string;
};

type PlotIndexMap = Record<string, number>;
type DatatableIndexMap = Record<string, number>;

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

function normalizePlotId(source: string): string {
	const trimmed = source.trim();
	return trimmed.replace(/\.[^/.]+$/, "");
}

function resolvePlotOverride(bodyText: string): PlotOverrideResult {
	if (!bodyText.trim()) {
		return { layoutOverride: {}, caption: "" };
	}

	let parsedBody: unknown = {};
	try {
		parsedBody = parseYaml(bodyText);
	} catch {
		parsedBody = null;
	}

	if (isRecord(parsedBody)) {
		const { caption, ...layoutOverride } = parsedBody;
		return {
			layoutOverride,
			caption: typeof caption === "string" ? caption.trim() : "",
		};
	}

	const lines = bodyText
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
	if (lines.length > 1) {
		const caption = lines[0];
		const yamlTail = lines.slice(1).join("\n");
		try {
			const parsedTail = parseYaml(yamlTail);
			if (isRecord(parsedTail)) {
				return { layoutOverride: parsedTail, caption };
			}
		} catch {}
	}

	return {
		layoutOverride: {},
		caption:
			typeof parsedBody === "string" ? parsedBody.trim() : bodyText.trim(),
	};
}

function resolvePlotDefinition(
	rawPlot: unknown,
	layoutOverride: PlotLayout,
): PlotDefinition | null {
	if (!isRecord(rawPlot) || !Array.isArray(rawPlot.data)) {
		return null;
	}

	const baseLayout = isRecord(rawPlot.layout) ? rawPlot.layout : {};
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

function getPlotBodyText(node: unknown): string {
	const value =
		getNodeProperty(node, "data-plot-body") ??
		getNodeProperty(node, "dataPlotBody");
	return asString(value);
}

function getDatatableSource(node: unknown): string {
	const value =
		getNodeProperty(node, "data-datatable-source") ??
		getNodeProperty(node, "dataDatatableSource");
	return asString(value);
}

function getDatatableBodyText(node: unknown): string {
	const value =
		getNodeProperty(node, "data-datatable-body") ??
		getNodeProperty(node, "dataDatatableBody");
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
	plotIndexById: PlotIndexMap,
	datatableIndexById: DatatableIndexMap,
	target: "web" | "print",
): Components["div"] {
	return function DirectiveDivRender({
		node,
		children,
		...rest
	}: PlottyDivProps) {
		const directive = getDirective(node);
		if (directive !== "plotty") {
			if (directive === "datatable") {
				return (
					<DatatableRenderBlock
						source={getDatatableSource(node)}
						bodyText={getDatatableBodyText(node)}
						datatableFiles={plotFiles}
						datatableIndexById={datatableIndexById}
						target={target}
					/>
				);
			}
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
		const bodyText = getPlotBodyText(node);
		const { layoutOverride, caption } = resolvePlotOverride(bodyText);
		const plotId = normalizePlotId(source);
		const rawPlot = plotFiles[source];
		const resolvedPlot = resolvePlotDefinition(rawPlot, layoutOverride);
		const resolvedLayout = resolvedPlot?.layout || {};
		const width = toNumber(resolvedLayout.width);
		const height = toNumber(resolvedLayout.height);
		const figureNo = plotIndexById[plotId];
		const titleFromLayout = asString(resolvedLayout.title);
		const captionText = caption || titleFromLayout;

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
			<div
				{...rest}
				id={plotId ? `plot-${plotId}` : undefined}
				className="plotty my-6 overflow-x-auto"
			>
				<PlottyChart plot={resolvedPlot} width={width} height={height} />
				{captionText && (
					<p className="title mt-2 text-center text-neutral-600 text-xs italic">
						{figureNo ? (
							<span className="label">{`Figure ${figureNo}. `}</span>
						) : null}
						{captionText}
					</p>
				)}
			</div>
		);
	};
}
