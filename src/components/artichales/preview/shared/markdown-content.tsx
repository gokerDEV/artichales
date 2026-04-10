import type { Root } from "mdast";
import * as React from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import type { Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeReact from "rehype-react";
import remarkRehype from "remark-rehype";
import type { Plugin } from "unified";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import type {
	DirectiveCategory,
	DirectiveConfig,
	DirectiveRendererDefinition,
} from "@/components/artichales/plugins/plugin.contract";
import { resolvePluginExecutionState } from "@/components/artichales/plugins/plugin.runtime";
import { buildAlignmentHeadingId } from "@/lib/alignment";
import "katex/dist/katex.min.css";
import type { ResolvedReference } from "@/lib/article-analysis";

type MarkdownContentProps = {
	ast: Root;
	content: string;
	target: "web" | "print";
	printTitle?: string;
	resolvedReferences: Record<string, ResolvedReference>;
	directiveConfigs?: Record<DirectiveCategory, DirectiveConfig>;
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

function getDirectiveProperty(node: unknown, key: string): string {
	if (!node || typeof node !== "object") return "";
	const record = node as UnknownRecord;
	const hProperties =
		record.data &&
		typeof record.data === "object" &&
		(record.data as UnknownRecord).hProperties &&
		typeof (record.data as UnknownRecord).hProperties === "object"
			? ((record.data as UnknownRecord).hProperties as UnknownRecord)
			: null;
	const props =
		record.properties && typeof record.properties === "object"
			? (record.properties as UnknownRecord)
			: null;
	const value =
		hProperties?.[key] ??
		props?.[key] ??
		props?.[key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())];
	return typeof value === "string" && value.trim() !== "" ? value : "";
}

export function MarkdownContent({
	ast,
	content: _content,
	target,
	printTitle,
	resolvedReferences,
	directiveConfigs,
	utilityClasses,
}: MarkdownContentProps) {
	const markdownComponents = React.useMemo(() => {
		const components: Partial<Components> = {};
		const executionState = resolvePluginExecutionState();
		const directiveRenderers = new Map<string, DirectiveRendererDefinition>();
		for (const plugin of executionState.render) {
			const renderHook = plugin.hooks.render;
			if (!renderHook) continue;
			try {
				Object.assign(
					components,
					renderHook({
						target,
						resolvedReferences,
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
		for (const plugin of executionState.render) {
			const directiveRenderHook = plugin.hooks.directiveRender;
			if (!directiveRenderHook) continue;
			try {
				const result = directiveRenderHook({
					target,
					resolvedReferences,
					utilityClasses,
				});
				const definitions = Array.isArray(result)
					? result
					: result
						? [result]
						: [];
				for (const definition of definitions) {
					directiveRenderers.set(definition.directive, definition);
				}
			} catch (error) {
				console.error(
					`[artichales:render] directive render hook failed for plugin "${plugin.id}"`,
					error,
				);
			}
		}
		const divRenderer = components.div as Components["div"] | undefined;
		components.div = ((props) => {
			const { node, children, ...rest } = props as ParagraphProps;
			const directive = getDirectiveProperty(node, "data-directive");
			const directiveRenderer = directiveRenderers.get(directive);
			if (directiveRenderer) {
				return directiveRenderer.component({
					...props,
					directive,
					raw: getDirectiveProperty(node, "data-directive-raw"),
					params: {
						data_file: getDirectiveProperty(node, "data-directive-data-file"),
					},
					config: directiveConfigs?.[directiveRenderer.category] || {},
					target,
				});
			}
			if (divRenderer) {
				return React.createElement(
					divRenderer as React.ComponentType<Record<string, unknown>>,
					props as Record<string, unknown>,
				);
			}
			return (
				<div {...(rest as React.HTMLAttributes<HTMLDivElement>)}>
					{children}
				</div>
			);
		}) as Components["div"];

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
			return (
				<p {...(rest as React.HTMLAttributes<HTMLParagraphElement>)}>
					{children}
				</p>
			);
		}) as Components["p"];

		return components;
	}, [target, resolvedReferences, directiveConfigs, utilityClasses]);

	const renderedContent = React.useMemo(() => {
		const astClone =
			globalThis.structuredClone &&
			typeof globalThis.structuredClone === "function"
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
