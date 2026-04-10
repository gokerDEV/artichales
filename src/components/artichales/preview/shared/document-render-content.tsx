import * as React from "react";
import { resolvePluginExecutionState } from "@/components/artichales/plugins/plugin.runtime";
import type { DocumentSource } from "@/hooks/use-document";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "./markdown-content";

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
		"--ac-font-body": fontFamily?.body || "serif",
		"--ac-font-heading": fontFamily?.heading || "sans-serif",
		"--ac-font-mono": fontFamily?.mono || "monospace",
		"--ac-font-size-body": fontSize?.body || "1rem",
		"--ac-font-size-h1": fontSize?.h1 || "2rem",
		"--ac-font-size-h2": fontSize?.h2 || "1.5rem",
		"--ac-font-size-h3": fontSize?.h3 || "1.25rem",
		"--ac-line-height": String(document.template.document?.lineHeight || 1.6),
		"--ac-text-color": colors?.text || "#111111",
		"--ac-muted-color": colors?.muted || "#666666",
		"--ac-border-color": colors?.border || "#d1d5db",
		"--ac-link-color": colors?.link || "#0f766e",
		"--ac-cite-class": utilities.cite || "cite",
		"--ac-ref-class": utilities.ref || "ref",
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
			className={cn(`artichales artichales--${target}`)}
			style={buildTemplateCssVars(document)}
		>
			{coreRenderers.get("title-core") ?? null}
				<article className={cn(contentClassName, articleClassName)}>
				{document.ast ? (
					<MarkdownContent
						ast={document.ast}
						content={document.content}
						plotFiles={document.plots}
						target={target}
						printTitle={
							target === "print" && typeof document.frontmatter.title === "string"
								? document.frontmatter.title
								: undefined
						}
						resolvedReferences={document.resolvedReferences}
						activeParserPluginIds={document.activePluginIds.parser}
						activeRenderPluginIds={document.activePluginIds.render}
						templateDefaults={{ components: document.template.componentDefaults }}
						referenceLabels={document.template.referenceLabels}
						utilityClasses={document.template.utilities}
					/>
				) : null}
				</article>
			{coreRenderers.get("references-core") ?? null}
		</div>
	);
}
