import type {
	Blockquote,
	Code,
	Delete,
	Emphasis,
	Heading,
	InlineCode,
	Link,
	List,
	ListItem,
	Paragraph,
	Root,
	RootContent,
	Strong,
	Text,
} from "mdast";
import type { ReactNode } from "react";
import { Fragment } from "react";
import { parseDirectiveNode } from "@/components/artichale/core/artichale.util";
import {
	createPluginRenderDiagnostic,
	createRenderDiagnostic,
} from "@/components/artichale/core/diagnostic";
import { createLastModifiedCache } from "@/components/artichale/core/last-modified.cache";
import {
	DisplayAs,
	type PluginRegistryMaps,
} from "@/components/artichale/types/plugin.types";
import type { ResolvedReference } from "@/components/artichale/types/reference.types";
import type {
	AssetResolver,
	JSONAssetReader,
	RenderDiagnostic,
	RenderTarget,
} from "@/components/artichale/types/render.types";
import type { TemplateResolved } from "@/components/artichale/types/template.types";

type RenderDirectiveContext = {
	target: RenderTarget;
	template: TemplateResolved;
	pluginRegistry: PluginRegistryMaps;
	resolvedReferences: ReadonlyMap<string, ResolvedReference>;
	fnJSONAssetReader: JSONAssetReader;
	fnAssetResolver: AssetResolver;
	diagnostics: RenderDiagnostic[];
};

type CaptionDisplayFamily = DisplayAs;

const CAPTION_DISPLAY_FAMILIES: ReadonlySet<CaptionDisplayFamily> = new Set([
	DisplayAs.FIGURE,
	DisplayAs.TABLE,
	DisplayAs.EQUATION,
	DisplayAs.CODE,
]);
const documentRenderCache =
	createLastModifiedCache<
		Promise<{ article: ReactNode; diagnostics: RenderDiagnostic[] }>
	>();

function getSourceLine(node: RootContent): number | undefined {
	return node.position?.start.line;
}

function textValue(node: Text): ReactNode {
	return node.value;
}

function inlineCodeValue(node: InlineCode): ReactNode {
	return <code>{node.value}</code>;
}

function codeValue(node: Code): ReactNode {
	const sourceLine = getSourceLine(node as unknown as RootContent);
	return (
		<pre data-source-line={sourceLine}>
			<code>{node.value}</code>
		</pre>
	);
}

function isDirectiveNode(node: RootContent): node is RootContent & {
	type: "textDirective" | "leafDirective" | "containerDirective";
	name: string;
	attributes?: Record<string, string | null | undefined>;
	children?: RootContent[];
} {
	return (
		node.type === "textDirective" ||
		node.type === "leafDirective" ||
		node.type === "containerDirective"
	);
}

async function renderDirective(
	node: RootContent & {
		type: "textDirective" | "leafDirective" | "containerDirective";
		name: string;
		attributes?: Record<string, string | null | undefined>;
		children?: RootContent[];
	},
	context: RenderDirectiveContext,
): Promise<ReactNode> {
	const pluginId = node.name.trim().toLowerCase();
	const plugin = context.pluginRegistry.byId.get(pluginId);

	if (!plugin) {
		context.diagnostics.push(
			createRenderDiagnostic({
				code: "render-plugin-missing",
				severity: "warning",
				message: `No plugin found for directive "${pluginId}".`,
				pluginId,
			}),
		);
		return null;
	}

	try {
		const rendered = await plugin.render({
			target: context.target,
			template: context.template,
			node,
			fnJSONAssetReader: context.fnJSONAssetReader,
			fnAssetResolver: context.fnAssetResolver,
			resolvedReferences: context.resolvedReferences,
		});

		if (!rendered) {
			return null;
		}

		const parsed = parseDirectiveNode(node);
		const shouldRenderCaption = CAPTION_DISPLAY_FAMILIES.has(plugin.displayAs);
		const captionContent = shouldRenderCaption
			? buildCaptionContent(
					parsed.id,
					parsed.caption,
					context.resolvedReferences,
				)
			: null;

		if (node.type === "textDirective") {
			return rendered;
		}

		return (
			<div
				id={parsed.id.replaceAll(":", "-")}
				className={`art-${plugin.id}`}
				data-plugin-id={plugin.id}
				data-source-line={getSourceLine(node)}
			>
				{rendered}
				{captionContent}
			</div>
		);
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		context.diagnostics.push(
			createPluginRenderDiagnostic({
				code: "render-plugin-failed",
				severity: "error",
				message: `Plugin "${pluginId}" render failed: ${detail}`,
				pluginId,
			}),
		);
		return null;
	}
}

function buildCaptionContent(
	id: string,
	captionText: string,
	resolvedReferences: ReadonlyMap<string, ResolvedReference>,
): ReactNode {
	const reference = resolvedReferences.get(id);
	const numberedLabel = reference?.label ?? "";
	const text = captionText || "";

	if (!numberedLabel && !text) {
		return null;
	}

	const parts: ReactNode[] = [];
	if (numberedLabel) {
		parts.push(<strong key="label">{numberedLabel}</strong>);
	}
	if (text) {
		if (numberedLabel) {
			parts.push(": ");
		}
		parts.push(text);
	}

	return <figcaption className="art-caption">{parts}</figcaption>;
}

async function renderChildren(
	nodes: RootContent[] | undefined,
	context: RenderDirectiveContext,
): Promise<ReactNode[]> {
	if (!nodes || nodes.length === 0) return [];
	const rendered = await Promise.all(
		nodes.map((node, index) => renderNode(node, context, index)),
	);
	return rendered.filter((node) => node !== null);
}

async function renderNode(
	node: RootContent,
	context: RenderDirectiveContext,
	key: number,
): Promise<ReactNode> {
	if (isDirectiveNode(node)) {
		return (
			<Fragment key={key}>{await renderDirective(node, context)}</Fragment>
		);
	}

	if (node.type === "text")
		return <Fragment key={key}>{textValue(node as Text)}</Fragment>;
	if (node.type === "inlineCode") {
		return <Fragment key={key}>{inlineCodeValue(node as InlineCode)}</Fragment>;
	}
	if (node.type === "code")
		return <Fragment key={key}>{codeValue(node as Code)}</Fragment>;
	if (node.type === "break") return <br key={key} />;

	if (node.type === "paragraph") {
		const children = await renderChildren(
			(node as Paragraph).children,
			context,
		);
		return (
			<p key={key} data-source-line={getSourceLine(node)}>
				{children}
			</p>
		);
	}
	if (node.type === "heading") {
		const headingNode = node as Heading;
		const HeadingTag = `h${Math.min(Math.max(headingNode.depth, 1), 6)}` as
			| "h1"
			| "h2"
			| "h3"
			| "h4"
			| "h5"
			| "h6";
		const children = await renderChildren(headingNode.children, context);
		return (
			<HeadingTag key={key} data-source-line={getSourceLine(node)}>
				{children}
			</HeadingTag>
		);
	}
	if (node.type === "strong") {
		const children = await renderChildren((node as Strong).children, context);
		return <strong key={key}>{children}</strong>;
	}
	if (node.type === "emphasis") {
		const children = await renderChildren((node as Emphasis).children, context);
		return <em key={key}>{children}</em>;
	}
	if (node.type === "delete") {
		const children = await renderChildren((node as Delete).children, context);
		return <del key={key}>{children}</del>;
	}
	if (node.type === "blockquote") {
		const children = await renderChildren(
			(node as Blockquote).children,
			context,
		);
		return (
			<blockquote key={key} data-source-line={getSourceLine(node)}>
				{children}
			</blockquote>
		);
	}
	if (node.type === "list") {
		const list = node as List;
		const children = await renderChildren(list.children, context);
		return list.ordered ? (
			<ol key={key} data-source-line={getSourceLine(node)}>
				{children}
			</ol>
		) : (
			<ul key={key} data-source-line={getSourceLine(node)}>
				{children}
			</ul>
		);
	}
	if (node.type === "listItem") {
		const children = await renderChildren((node as ListItem).children, context);
		return (
			<li key={key} data-source-line={getSourceLine(node)}>
				{children}
			</li>
		);
	}
	if (node.type === "link") {
		const link = node as Link;
		const children = await renderChildren(link.children, context);
		return (
			<a key={key} href={link.url}>
				{children}
			</a>
		);
	}

	context.diagnostics.push(
		createRenderDiagnostic({
			code: "render-node-unsupported",
			severity: "info",
			message: `Unsupported node type "${node.type}" skipped.`,
		}),
	);
	return null;
}

export async function renderDocument(input: {
	ast: Root | null;
	target: RenderTarget;
	lastModified: string;
	template: TemplateResolved;
	pluginRegistry: PluginRegistryMaps;
	resolvedReferences: ReadonlyMap<string, ResolvedReference>;
	fnJSONAssetReader: JSONAssetReader;
	fnAssetResolver: AssetResolver;
}): Promise<{ article: ReactNode; diagnostics: RenderDiagnostic[] }> {
	const cached = documentRenderCache.get(input.lastModified);
	if (cached) return cached;

	const resultPromise = (async () => {
		const diagnostics: RenderDiagnostic[] = [];

		if (!input.ast) {
			return {
				article: null,
				diagnostics,
			};
		}

		const children = await renderChildren(input.ast.children, {
			target: input.target,
			template: input.template,
			pluginRegistry: input.pluginRegistry,
			resolvedReferences: input.resolvedReferences,
			fnJSONAssetReader: input.fnJSONAssetReader,
			fnAssetResolver: input.fnAssetResolver,
			diagnostics,
		});

		return {
			article: <article>{children}</article>,
			diagnostics,
		};
	})();

	documentRenderCache.set(input.lastModified, resultPromise);
	return resultPromise;
}
