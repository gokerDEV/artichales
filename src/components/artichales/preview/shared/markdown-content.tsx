import type { Root } from "mdast";
import * as React from "react";
import type { Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeReact from "rehype-react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import remarkRehype from "remark-rehype";
import type { Plugin } from "unified";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import {
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
	printTitle?: string;
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
type ParagraphProps = {
	children?: React.ReactNode;
	node?: unknown;
} & UnknownRecord;

function normalizeInlineText(value: string): string {
	return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function extractNodeText(node: unknown): string {
	if (!node || typeof node !== "object") return "";
	const record = node as UnknownRecord;
	const ownValue = typeof record.value === "string" ? record.value : "";
	const children = Array.isArray(record.children) ? record.children : [];
	return [ownValue, ...children.map((child) => extractNodeText(child))]
		.join("")
		.trim();
}

function extractDirectiveSource(node: unknown, propertyName: string): string {
	if (!node || typeof node !== "object") return "";
	const record = node as UnknownRecord;
	const data =
		record.data && typeof record.data === "object"
			? (record.data as UnknownRecord)
			: null;
	const hProperties =
		data?.hProperties && typeof data.hProperties === "object"
			? (data.hProperties as UnknownRecord)
			: null;
	const directSource = hProperties?.[propertyName];
	if (typeof directSource === "string" && directSource.trim() !== "") {
		return directSource;
	}

	const children = Array.isArray(record.children) ? record.children : [];
	const firstChild =
		children[0] && typeof children[0] === "object"
			? (children[0] as UnknownRecord)
			: null;
	const nestedChildren = Array.isArray(firstChild?.children)
		? firstChild.children
		: [];
	const firstGrandchild =
		nestedChildren[0] && typeof nestedChildren[0] === "object"
			? (nestedChildren[0] as UnknownRecord)
			: null;
	return typeof firstGrandchild?.value === "string" ? firstGrandchild.value : "";
}

const remarkAlignmentHeadingAnchors: Plugin<[], Root> = () => {
	return (tree: Root) => {
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

function stripDuplicatePrintLeadBlocks(ast: Root, printTitle?: string): void {
	const normalizedTitle =
		typeof printTitle === "string" && printTitle.trim() !== ""
			? normalizeInlineText(printTitle)
			: "";

	let hasAbstractDirective = false;
	visit(ast, (node) => {
		const candidate = node as unknown as UnknownRecord;
		if (
			(candidate.type === "containerDirective" ||
				candidate.type === "leafDirective") &&
			candidate.name === "abstract"
		) {
			hasAbstractDirective = true;
		}
	});

	type TraversalNode = UnknownRecord & { type?: string; depth?: number };
	const walk = (node: TraversalNode) => {
		const children = Array.isArray(node.children)
			? (node.children as TraversalNode[])
			: null;
		if (!children || children.length === 0) return;

		for (let index = 0; index < children.length; index++) {
			const child = children[index];
				if (!child || typeof child !== "object") continue;
				if (child.type === "heading") {
					const headingText = normalizeInlineText(extractNodeText(child));
					const isTitleDuplicate =
						normalizedTitle !== "" &&
						child.depth === 1 &&
						headingText === normalizedTitle;
				const isAbstractDuplicate =
					hasAbstractDirective && headingText === "abstract";
				if (isTitleDuplicate || isAbstractDuplicate) {
					children.splice(index, 1);
					return;
				}
			}
			walk(child);
		}
	};

	walk(ast as unknown as TraversalNode);
}

export function MarkdownContent({
	ast,
	content: _content,
	plotFiles,
	target,
	printTitle,
	resolvedReferences,
	activeParserPluginIds: _activeParserPluginIds,
	activeRenderPluginIds,
	templateDefaults,
	referenceLabels,
	utilityClasses,
}: MarkdownContentProps) {
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
				const uNode = node as unknown as UnknownRecord;
				if (uNode.type === "containerDirective" || uNode.type === "leafDirective") {
					if (uNode.name === "plotty") {
						const sourceStr = extractDirectiveSource(node, "data-plot-source");
						const dataPlotSource = sourceStr.replace(/\.[^/.]+$/, "");
						if (dataPlotSource && plotMap[dataPlotSource] === undefined) {
							plotMap[dataPlotSource] = plotIdx;
							refMap[dataPlotSource] = { kind: "plot", index: plotIdx };
							plotIdx++;
						}
					} else if (uNode.name === "datatable") {
						const sourceStr = extractDirectiveSource(
							node,
							"data-datatable-source",
						);
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
		const components: Partial<Components> = {};
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

		const paragraphRenderer = components.p as
			| ((props: ParagraphProps) => React.ReactNode)
			| undefined;
		components.p = ((props: ParagraphProps) => {
			const { children, node: _node, ...rest } = props;
			const childNodes = React.Children.toArray(children);
			const hasDirectiveBlock = childNodes.some((child) => {
				if (!React.isValidElement(child)) return false;
				const props = child.props as UnknownRecord;
				const node = (props.node as UnknownRecord | undefined) || undefined;
				const componentType = child.type as
					| string
					| { displayName?: string; name?: string };
				const componentName =
					typeof componentType === "string"
						? componentType
						: componentType.displayName || componentType.name || "";
				const nodeTagName =
					typeof node?.tagName === "string" ? node.tagName : undefined;
				const nodeProperties =
					(node?.properties as UnknownRecord | undefined) || undefined;
				const nodeDirective =
					nodeProperties?.["data-directive"] ?? nodeProperties?.dataDirective;
				if (nodeDirective !== undefined || nodeTagName === "div") return true;
				if (
					componentName === "DirectiveDivRender" ||
					componentName === "AbstractRender" ||
					componentName === "DatatableRenderBlock"
				) {
					return true;
				}
				if (props["data-flow-span"] !== undefined) return true;
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
			if (paragraphRenderer) {
				return paragraphRenderer(props);
			}
			return <p {...(rest as React.HTMLAttributes<HTMLParagraphElement>)}>{children}</p>;
		}) as Components["p"];

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

	const renderedContent = React.useMemo(() => {
		const astClone = globalThis.structuredClone
			&& typeof globalThis.structuredClone === "function"
			? (structuredClone(ast) as Root)
			: (JSON.parse(JSON.stringify(ast)) as Root);
		if (target === "print") {
			stripDuplicatePrintLeadBlocks(astClone, printTitle);
		}
		const processor = unified()
			.use(remarkAlignmentHeadingAnchors)
			.use(remarkRehype, { allowDangerousHtml: true })
			.use(rehypeKatex)
			.use(rehypeReact as any, {
				Fragment,
				jsx,
				jsxs,
				components: markdownComponents,
			});

			const tree = processor.runSync(astClone);
			return processor.stringify(tree) as React.ReactNode;
	}, [ast, markdownComponents, printTitle, target]);

	return <>{renderedContent}</>;
}
