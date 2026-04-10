import type { Root } from "mdast";
import * as React from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import {
	getParserRemarkPluginsFromExecutionState,
	resolvePluginExecutionState,
} from "@/components/artichales/plugins/plugin.runtime";
import { buildAlignmentHeadingId } from "@/lib/alignment";
import "katex/dist/katex.min.css";
import type { ResolvedReference } from "@/lib/article-analysis";

type MarkdownContentProps = {
	ast: Root;
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
				defaultSpan?: "column" | "page";
				spacingBefore?: string;
				spacingAfter?: string;
			};
			table?: {
				captionPosition?: "top" | "bottom";
				defaultSpan?: "column" | "page";
				spacingBefore?: string;
				spacingAfter?: string;
			};
		};
	};
	referenceLabels?: Record<string, string>;
	utilityClasses?: Record<string, string>;
};

type UnknownRecord = Record<string, unknown>;

function extractNodeText(node: unknown): string {
	if (!node || typeof node !== "object") return "";
	const record = node as UnknownRecord;
	const ownValue = typeof record.value === "string" ? record.value : "";
	const children = Array.isArray(record.children) ? record.children : [];
	return [ownValue, ...children.map((child) => extractNodeText(child))]
		.join("")
		.trim();
}

const remarkAlignmentHeadingAnchors: Plugin<[], Root> = () => {
	return (tree) => {
		const slugCounts = new Map<string, number>();
		visit(tree, "heading", (node) => {
			const heading = node as unknown as UnknownRecord;
			const text = extractNodeText(heading) || "Heading";
			const slug =
				text
					.toLowerCase()
					.trim()
					.replace(/[^a-z0-9]+/g, "-")
					.replace(/^-+|-+$/g, "") || "heading";
			const occurrence = (slugCounts.get(slug) ?? 0) + 1;
			slugCounts.set(slug, occurrence);
			const headingId = buildAlignmentHeadingId(text, occurrence);

			const data = (heading.data as UnknownRecord | undefined) || {};
			const hProperties = (data.hProperties as UnknownRecord | undefined) || {};
			heading.data = {
				...data,
				hProperties: {
					...hProperties,
					"data-ac-heading-id": headingId,
				},
			};
		});
	};
};

export function MarkdownContent({
	ast,
	content,
	plotFiles,
	target,
	resolvedReferences,
	activeParserPluginIds,
	activeRenderPluginIds,
	templateDefaults,
	referenceLabels,
	utilityClasses,
}: MarkdownContentProps) {
	const parserPlugins = React.useMemo(() => {
		const executionState = resolvePluginExecutionState(activeParserPluginIds);
		return getParserRemarkPluginsFromExecutionState(executionState);
	}, [activeParserPluginIds]);
	const { plotIndexById, datatableIndexById, refIndexById } =
		React.useMemo(() => {
			const plotMap: Record<string, number> = {};
			const datatableMap: Record<string, number> = {};
			const refMap: Record<
				string,
				{
					kind: "plot" | "datatable";
					index: number;
				}
			> = {};
			let plotIdx = 1;
			let datatableIdx = 1;

			visit(ast, (node) => {
				const uNode = node as any;
				if (uNode.type === "containerDirective" || uNode.type === "leafDirective") {
					if (uNode.name === "plotty") {
						const sourceStr = uNode.data?.hProperties?.["data-plot-source"] || uNode.children?.[0]?.children?.[0]?.value || "";
						const dataPlotSource = sourceStr.replace(/\.[^/.]+$/, "");
						if (dataPlotSource && plotMap[dataPlotSource] === undefined) {
							plotMap[dataPlotSource] = plotIdx;
							refMap[dataPlotSource] = { kind: "plot", index: plotIdx };
							plotIdx++;
						}
					} else if (uNode.name === "datatable") {
						const sourceStr = uNode.data?.hProperties?.["data-table-source"] || uNode.children?.[0]?.children?.[0]?.value || "";
						const dataTableSource = sourceStr.replace(/\.[^/.]+$/, "");
						if (dataTableSource && datatableMap[dataTableSource] === undefined) {
							datatableMap[dataTableSource] = datatableIdx;
							refMap[dataTableSource] = { kind: "datatable", index: datatableIdx };
							datatableIdx++;
						}
					}
				}
			});

			return {
				plotIndexById: plotMap,
				datatableIndexById: datatableMap,
				refIndexById: refMap,
			};
		}, [ast]);

	const markdownComponents = React.useMemo(() => {
		const components: React.ComponentProps<typeof ReactMarkdown>["components"] =
			{};
		const executionState = resolvePluginExecutionState(activeRenderPluginIds);
		for (const plugin of executionState.render) {
			const renderHook = plugin.hooks.render;
			if (!renderHook) continue;
			try {
				Object.assign(
					components,
					renderHook({
						plotFiles,
						plotIndexById,
						datatableIndexById,
						refIndexById,
						target,
						resolvedReferences,
						templateDefaults: templateDefaults?.components,
						referenceLabels,
						utilityClasses,
					}),
				);
			} catch (error) {
				console.error(
					`[artichales:render] render hook failed for plugin "${plugin.id}"`,
					error,
				);
			}
		}

		const paragraphRenderer = components.p as Components["p"] | undefined;
		components.p = ({ children, ...rest }) => {
			const childNodes = React.Children.toArray(children);
			const hasDirectiveBlock = childNodes.some((child) => {
				if (!React.isValidElement(child)) return false;
				const props = child.props as UnknownRecord;
				const node = (props.node as UnknownRecord | undefined) || undefined;
				const nodeTagName =
					typeof node?.tagName === "string" ? node.tagName : undefined;
				const nodeProperties =
					(node?.properties as UnknownRecord | undefined) || undefined;
				const nodeDirective =
					nodeProperties?.["data-directive"] ?? nodeProperties?.dataDirective;
				if (nodeDirective !== undefined || nodeTagName === "div") return true;
				if (typeof child.type !== "string") return false;
				if (child.type !== "div") return false;
				return (
					props["data-directive"] !== undefined ||
					props.dataDirective !== undefined
				);
			});
			if (hasDirectiveBlock) {
				return <>{children}</>;
			}
			if (paragraphRenderer && typeof paragraphRenderer !== "string") {
				return React.createElement(paragraphRenderer, rest, children);
			}
			return <p {...rest}>{children}</p>;
		};

		return components;
	}, [
		activeRenderPluginIds,
		plotFiles,
		plotIndexById,
		datatableIndexById,
		refIndexById,
		target,
		resolvedReferences,
		templateDefaults,
		referenceLabels,
		utilityClasses,
	]);

	return (
		<ReactMarkdown
			remarkPlugins={[
				remarkGfm,
				remarkDirective,
				...parserPlugins,
				remarkAlignmentHeadingAnchors,
			]}
			rehypePlugins={[rehypeKatex]}
			components={markdownComponents}
		>
			{content}
		</ReactMarkdown>
	);
}
