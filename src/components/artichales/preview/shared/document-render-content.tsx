import * as React from "react";
import { resolvePluginExecutionState } from "@/components/artichales/plugins/plugin.runtime";
import type { DocumentSource } from "@/hooks/use-document";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "./markdown-content";

import "@/components/artichales/base/index.css";

type RenderTarget = "web" | "print";

type DocumentRenderContentProps = {
	document: DocumentSource;
	target: RenderTarget;
	contentClassName?: string;
	articleClassName?: string;
};

type CssVarStyle = React.CSSProperties & Record<string, string>;

function buildTemplateCssVars(document: DocumentSource): CssVarStyle {
	const fontFamily = document.template.document?.fontFamily;
	const fontSize = document.template.document?.fontSize;
	const colors = document.template.colors;
	const utilities = document.template.utilities || {};

	return {
		"--art-font-body": fontFamily?.body || "serif",
		"--art-font-heading": fontFamily?.heading || "sans-serif",
		"--art-font-mono": fontFamily?.mono || "monospace",
		"--art-font-size-body": fontSize?.body || "1rem",
		"--art-font-size-h1": fontSize?.h1 || "2rem",
		"--art-font-size-h2": fontSize?.h2 || "1.5rem",
		"--art-font-size-h3": fontSize?.h3 || "1.25rem",
		"--art-line-height": String(document.template.document?.lineHeight || 1.6),
		"--art-text-color": colors?.text || "#111111",
		"--art-muted-color": colors?.muted || "#666666",
		"--art-border-color": colors?.border || "#d1d5db",
		"--art-link-color": colors?.link || "#0f766e",
		"--art-cite-class": utilities.cite || "cite",
		"--art-ref-class": utilities.ref || "ref",
	};
}

export function DocumentRenderContent({
	document,
	target,
	contentClassName,
	articleClassName,
}: DocumentRenderContentProps) {
	const coreRenderers = React.useMemo(() => {
		const executionState = resolvePluginExecutionState(
			document.activePluginIds.core,
		);
		const renderedById = new Map<string, React.ReactNode>();
		for (const plugin of executionState.core) {
			const renderHook = plugin.hooks.coreRender;
			if (!renderHook) continue;
			renderedById.set(
				plugin.id,
				renderHook({
					document,
					target,
				}),
			);
		}
		return renderedById;
	}, [document, target]);

	return (
		<div
			id="artichales"
			className={cn(`artichales art--${target}`)}
			style={buildTemplateCssVars(document)}
		>
			{coreRenderers.get("title") ?? null}
			{coreRenderers.get("author") ?? null}
			<article className={cn(contentClassName, articleClassName)}>
				{document.ast ? (
					<MarkdownContent
						ast={document.ast}
						content={document.content}
						target={target}
						printTitle={
							target === "print" &&
							typeof document.frontmatter.title === "string"
								? document.frontmatter.title
								: undefined
						}
						resolvedReferences={document.resolvedReferences}
						captions={document.captions}
						pluginConfigs={document.template.pluginConfigs}
						utilityClasses={document.template.utilities}
					/>
				) : null}
			</article>
			{coreRenderers.get("references") ?? null}
		</div>
	);
}
