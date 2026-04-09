import * as React from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import { CitationRender } from "@/components/artichales/plugins/citation.render.plugin";
import { CodeRender } from "@/components/artichales/plugins/code.render.plugin";
import { createDirectiveDivRender } from "@/components/artichales/plugins/plotty.render.plugin";
import {
	getParserRemarkPluginsFromExecutionState,
	resolvePluginExecutionState,
} from "@/components/artichales/plugins/plugin.runtime";
import { createRefRender } from "@/components/artichales/plugins/ref.render.plugin";
import "katex/dist/katex.min.css";
import { citationRenderPlugin } from "@/components/artichales/plugins/citation.render.plugin";
import { codeRenderPlugin } from "@/components/artichales/plugins/code.render.plugin";
import { plottyRenderPlugin } from "@/components/artichales/plugins/plotty.render.plugin";
import { refRenderPlugin } from "@/components/artichales/plugins/ref.render.plugin";
import type { ResolvedReference } from "@/lib/article-analysis";

type MarkdownContentProps = {
	content: string;
	plotFiles: Record<string, unknown>;
	target: "web" | "print";
	resolvedReferences: Record<string, ResolvedReference>;
	activeParserPluginIds: string[];
	activeRenderPluginIds: string[];
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
	referenceLabels?: Record<string, string>;
	utilityClasses?: Record<string, string>;
};

export function MarkdownContent({
	content,
	plotFiles,
	target,
	resolvedReferences,
	activeParserPluginIds,
	activeRenderPluginIds,
	indexContent,
	templateDefaults,
	referenceLabels,
	utilityClasses,
}: MarkdownContentProps) {
	const parserPlugins = React.useMemo(() => {
		const executionState = resolvePluginExecutionState(
			activeParserPluginIds.map((id) => ({ id, enabled: true })),
		);
		return getParserRemarkPluginsFromExecutionState(executionState);
	}, [activeParserPluginIds]);
	const enabledRenderPluginIds = React.useMemo(
		() => new Set(activeRenderPluginIds),
		[activeRenderPluginIds],
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
		() =>
			createRefRender(
				refIndexById,
				resolvedReferences,
				utilityClasses?.ref || "ref",
				referenceLabels,
			),
		[refIndexById, resolvedReferences, utilityClasses, referenceLabels],
	);
	const markdownComponents = React.useMemo(() => {
		const components: React.ComponentProps<typeof ReactMarkdown>["components"] =
			{};
		if (enabledRenderPluginIds.has(citationRenderPlugin.id)) {
			components.cite = CitationRender;
		}
		if (enabledRenderPluginIds.has(codeRenderPlugin.id)) {
			components.code = CodeRender;
		}
		if (enabledRenderPluginIds.has(plottyRenderPlugin.id)) {
			components.div = divRenderer;
		}
		if (enabledRenderPluginIds.has(refRenderPlugin.id)) {
			components.span = refRenderer;
		}
		return components;
	}, [divRenderer, enabledRenderPluginIds, refRenderer]);

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
