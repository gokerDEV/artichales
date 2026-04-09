import type React from "react";
import { loadPluginRegistry } from "@/components/artichales/plugins/plugin.registry";
import { ReferencesCorePlugin } from "@/components/artichales/plugins/references.core.plugin";
import { TitleCorePlugin } from "@/components/artichales/plugins/title.core.plugin";
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
	const enabledPluginIds = new Set(
		loadPluginRegistry(document.template.plugins).map((plugin) => plugin.id),
	);
	const showTitle = enabledPluginIds.has("title-core");
	const showReferences = enabledPluginIds.has("references-core");

	return (
		<div
			id="artichales"
			className={cn(`artichales artichales--${target}`)}
			style={buildTemplateCssVars(document)}
		>
			{showTitle ? (
				<TitleCorePlugin document={document} target={target} />
			) : null}
			<article className={cn(contentClassName, articleClassName)}>
				<MarkdownContent
					content={document.content}
					plotFiles={document.plots}
					target={target}
					resolvedReferences={document.resolvedReferences}
					templateDefaults={{ components: document.template.componentDefaults }}
					utilityClasses={document.template.utilities}
					pluginRegistry={document.template.plugins}
				/>
			</article>
			{showReferences ? (
				<ReferencesCorePlugin document={document} target={target} />
			) : null}
		</div>
	);
}
