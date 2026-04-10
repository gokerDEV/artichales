import * as React from "react";
import { DirectiveCaption } from "@/components/artichales/plugins/directive-caption";
import { useDirectiveFrame } from "@/components/artichales/plugins/directive-frame";
import type { DocumentTemplate } from "@/hooks/use-document";
import { isRecord, type UnknownRecord } from "@/lib/artichales.utils";
import { getDirectiveString } from "@/lib/directive.utils";
import { formatAssetId } from "@/lib/workspace";
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

type PlottyChartProps = {
	plot: PlotDefinition;
	width?: number;
	height?: number;
};

type PlotIndexMap = Record<string, number>;
type ComponentTemplateDefaults = DocumentTemplate["componentDefaults"];

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

type PlottyRenderBlockProps = {
	source: string;
	bodyText: string;
	plotFiles: Record<string, unknown>;
	plotIndexById: PlotIndexMap;
	defaults?: NonNullable<ComponentTemplateDefaults>["figure"];
	referenceLabels?: Record<string, string>;
	utilityClasses?: Record<string, string>;
	containerProps: Omit<React.HTMLAttributes<HTMLDivElement>, "children">;
};

function PlottyRenderBlock({
	source,
	bodyText,
	plotFiles,
	plotIndexById,
	defaults,
	referenceLabels,
	utilityClasses,
	containerProps,
}: PlottyRenderBlockProps) {
	const plotId = formatAssetId(source);
	const rawPlot = plotFiles[source];
	const baseLayout =
		isRecord(rawPlot) && isRecord(rawPlot.layout) ? rawPlot.layout : {};
	const titleFromLayout =
		typeof baseLayout.title === "string" ? baseLayout.title : undefined;
	const {
		extra: layoutOverride,
		flow,
		captionPosition,
		spacingBefore,
		spacingAfter,
		captionProps,
	} = useDirectiveFrame<PlotLayout>({
		directive: "plotty",
		primitive: "figure",
		bodyText,
		defaults,
		number: plotIndexById[plotId],
		referenceLabels,
		utilityClasses,
		fallbackCaption: titleFromLayout,
	});
	const resolvedPlot = React.useMemo(
		() => resolvePlotDefinition(rawPlot, layoutOverride),
		[layoutOverride, rawPlot],
	);
	const resolvedLayout = resolvedPlot?.layout || {};
	const width = toNumber(resolvedLayout.width);
	const height = toNumber(resolvedLayout.height);

	if (!resolvedPlot) {
		return (
			<div
				{...containerProps}
				className="rounded-md border border-red-300 bg-red-50 p-3 text-red-700 text-xs"
			>
				Plotty source not found or invalid:{" "}
				<strong>{source || "(empty)"}</strong>
			</div>
		);
	}

	return (
		<div
			{...containerProps}
			id={plotId ? `plot-${plotId}` : undefined}
			className="plotty my-6 overflow-x-auto"
			data-flow-span={flow.span}
			data-flow-break-before={flow.breakBefore}
			data-flow-break-after={flow.breakAfter}
			style={{
				marginTop: spacingBefore,
				marginBottom: spacingAfter,
			}}
		>
			{captionPosition === "top" ? (
				<DirectiveCaption {...captionProps} />
			) : null}
			<MemoizedPlottyChart plot={resolvedPlot} width={width} height={height} />
			{captionPosition === "bottom" ? (
				<DirectiveCaption {...captionProps} />
			) : null}
		</div>
	);
}

function registerPlottyRenderRuntime(
	context: RenderHookContext,
): DirectiveRendererDefinition {
	return {
		directive: "plotty",
		primitive: "figure",
		component: function PlottyDirectiveRender({
			node,
			...rest
		}: DirectiveComponentProps) {
			const restProps = rest as UnknownRecord;
			return (
				<PlottyRenderBlock
					source={getDirectiveString(
						node,
						restProps,
						"data-plot-source",
						"dataPlotSource",
					)}
					bodyText={getDirectiveString(
						node,
						restProps,
						"data-plot-body",
						"dataPlotBody",
					)}
					plotFiles={context.plotFiles}
					plotIndexById={context.plotIndexById}
					defaults={context.templateDefaults?.figure}
					referenceLabels={context.referenceLabels}
					utilityClasses={context.utilityClasses}
					containerProps={rest}
				/>
			);
		},
	};
}

export const plottyRenderPlugin: PluginDefinition = {
	id: "plotty-render",
	category: "render",
	name: "Plotty Render",
	hooks: {
		directiveRender: registerPlottyRenderRuntime,
	},
};
