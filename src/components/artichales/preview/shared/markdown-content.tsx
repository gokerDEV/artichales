import * as React from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import type { Pluggable } from "unified";
import {
	abstractParserPlugin,
	remarkAbstract,
} from "@/components/artichales/plugins/abstract.parser.plugin";
import { remarkCitation } from "@/components/artichales/plugins/citation.parser.plugin";
import { CitationRender } from "@/components/artichales/plugins/citation.render.plugin";
import { CodeRender } from "@/components/artichales/plugins/code.render.plugin";
import { remarkDatatable } from "@/components/artichales/plugins/datatable.parser.plugin";
import { remarkMathEquation } from "@/components/artichales/plugins/math.parser.plugin";
import { remarkPlotty } from "@/components/artichales/plugins/plotty.parser.plugin";
import { createDirectiveDivRender } from "@/components/artichales/plugins/plotty.render.plugin";
import type { PluginRegistryEntry } from "@/components/artichales/plugins/plugin.registry";
import {
	getPluginsByCategory,
	loadPluginRegistry,
} from "@/components/artichales/plugins/plugin.registry";
import { createRefRender } from "@/components/artichales/plugins/ref.render.plugin";
import "katex/dist/katex.min.css";
import { citationParserPlugin } from "@/components/artichales/plugins/citation.parser.plugin";
import { citationRenderPlugin } from "@/components/artichales/plugins/citation.render.plugin";
import { codeRenderPlugin } from "@/components/artichales/plugins/code.render.plugin";
import { datatableParserPlugin } from "@/components/artichales/plugins/datatable.parser.plugin";
import { mathParserPlugin } from "@/components/artichales/plugins/math.parser.plugin";
import { plottyParserPlugin } from "@/components/artichales/plugins/plotty.parser.plugin";
import { plottyRenderPlugin } from "@/components/artichales/plugins/plotty.render.plugin";
import { refRenderPlugin } from "@/components/artichales/plugins/ref.render.plugin";

type MarkdownContentProps = {
	content: string;
	plotFiles: Record<string, unknown>;
	target: "web" | "print";
	indexContent?: string;
	templateDefaults?: {
		components?: {
			figure?: {
				captionPosition?: "top" | "bottom";
				defaultSpan?: "column" | "full";
				spacingBefore?: string;
				spacingAfter?: string;
			};
			table?: {
				captionPosition?: "top" | "bottom";
				defaultSpan?: "column" | "full";
				spacingBefore?: string;
				spacingAfter?: string;
			};
		};
	};
	utilityClasses?: Record<string, string>;
	pluginRegistry?: PluginRegistryEntry[];
};

export function MarkdownContent({
	content,
	plotFiles,
	target,
	indexContent,
	templateDefaults,
	utilityClasses,
	pluginRegistry,
}: MarkdownContentProps) {
	const parserPlugins = React.useMemo(() => {
		const parserPluginMap: Record<string, Pluggable> = {
			[citationParserPlugin.id]: remarkCitation,
			[abstractParserPlugin.id]: remarkAbstract,
			[plottyParserPlugin.id]: remarkPlotty,
			[datatableParserPlugin.id]: remarkDatatable,
			[mathParserPlugin.id]: remarkMathEquation,
		};

		return getPluginsByCategory("parser", pluginRegistry)
			.map((plugin) => parserPluginMap[plugin.id])
			.filter((plugin): plugin is Pluggable => Boolean(plugin));
	}, [pluginRegistry]);
	const enabledPluginIds = React.useMemo(
		() =>
			new Set(loadPluginRegistry(pluginRegistry).map((plugin) => plugin.id)),
		[pluginRegistry],
	);

	const indexingSource = indexContent || content;
	const { plotIndexById, datatableIndexById, refIndexById } =
		React.useMemo(() => {
			const regex = /:::(plotty|datatable)\[(.+?)\]/g;
			const plotMap: Record<string, number> = {};
			const datatableMap: Record<string, number> = {};
			const refMap: Record<
				string,
				{
					kind: "plot" | "datatable";
					index: number;
				}
			> = {};
			let match: RegExpExecArray | null = null;
			let plotIdx = 1;
			let datatableIdx = 1;

			while (true) {
				match = regex.exec(indexingSource);
				if (match === null) break;
				const kind = match[1]?.trim();
				const source = match[2]?.trim() || "";
				const id = source.replace(/\.[^/.]+$/, "");
				if (!id) continue;

				if (kind === "plotty" && plotMap[id] === undefined) {
					plotMap[id] = plotIdx;
					refMap[id] = { kind: "plot", index: plotIdx };
					plotIdx++;
					continue;
				}
				if (kind === "datatable" && datatableMap[id] === undefined) {
					datatableMap[id] = datatableIdx;
					refMap[id] = { kind: "datatable", index: datatableIdx };
					datatableIdx++;
				}
			}

			return {
				plotIndexById: plotMap,
				datatableIndexById: datatableMap,
				refIndexById: refMap,
			};
		}, [indexingSource]);

	const divRenderer = React.useMemo(
		() =>
			createDirectiveDivRender(
				plotFiles,
				plotIndexById,
				datatableIndexById,
				target,
				templateDefaults?.components,
			),
		[plotFiles, plotIndexById, datatableIndexById, target, templateDefaults],
	);
	const refRenderer = React.useMemo(
		() => createRefRender(refIndexById, utilityClasses?.ref || "ref"),
		[refIndexById, utilityClasses],
	);
	const markdownComponents = React.useMemo(() => {
		const components: React.ComponentProps<typeof ReactMarkdown>["components"] =
			{};
		if (enabledPluginIds.has(citationRenderPlugin.id)) {
			components.cite = CitationRender;
		}
		if (enabledPluginIds.has(codeRenderPlugin.id)) {
			components.code = CodeRender;
		}
		if (enabledPluginIds.has(plottyRenderPlugin.id)) {
			components.div = divRenderer;
		}
		if (enabledPluginIds.has(refRenderPlugin.id)) {
			components.span = refRenderer;
		}
		return components;
	}, [divRenderer, enabledPluginIds, refRenderer]);

	return (
		<ReactMarkdown
			remarkPlugins={[...parserPlugins, remarkGfm, remarkDirective]}
			rehypePlugins={[rehypeKatex]}
			components={markdownComponents}
		>
			{content}
		</ReactMarkdown>
	);
}
