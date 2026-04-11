import * as React from "react";
import type { DocumentSource } from "@/hooks/use-document";
import { cn } from "@/lib/utils";
import type {
	CoreRenderHookContext,
	PluginDefinition,
} from "./plugin.contract";

function renderTitleCore(context: CoreRenderHookContext) {
	return (
		<TitleCorePlugin
			document={context.document}
			target={context.target}
			className={context.className}
		/>
	);
}

export const titleRenderPlugin: PluginDefinition = {
	id: "title",
	category: "title",
	name: "Title",
	hooks: {
		coreRender: renderTitleCore,
	},
};

export const TitleCorePlugin = React.memo(
	function TitleCorePlugin({
		document,
		target,
		className,
	}: {
		document: DocumentSource;
		target: "web" | "print";
		className?: string;
	}) {
		const { frontmatter, template } = document;

		const titleBlock = template?.titleBlock || {
			enabled: true,
			showAuthors: true,
			showAffiliations: true,
			align: "center",
		};

		if (titleBlock.enabled === false) return null;

		const docStyle = template?.document || {};
		const isCenter = titleBlock.align === "center";
		const isRight = titleBlock.align === "right";

		const titleAlignClass = isCenter
			? "text-center"
			: isRight
				? "text-right"
				: "text-left";

		const title =
			typeof frontmatter?.title === "string" ? frontmatter.title : "Untitled";

		const isPrint = target === "print";

		return (
			<header
				className={cn(
					"flex flex-col gap-4",
					isPrint ? "mb-6" : "mb-8",
					titleAlignClass,
					className,
				)}
				style={{
					marginBottom: isPrint ? titleBlock.spacingAfter : undefined,
				}}
			>
				<h1
					className={cn(
						"font-bold leading-tight",
						isPrint ? "text-2xl" : "text-3xl",
					)}
					style={{
						color: "var(--ac-text-color)",
						fontFamily: docStyle.fontFamily?.heading,
						fontSize: docStyle.fontSize?.h1,
					}}
				>
					{title}
				</h1>
			</header>
		);
	},
	(prevProps, nextProps) => {
		return (
			prevProps.target === nextProps.target &&
			prevProps.className === nextProps.className &&
			prevProps.document.frontmatter?.title ===
				nextProps.document.frontmatter?.title &&
			prevProps.document.template?.titleBlock ===
				nextProps.document.template?.titleBlock &&
			prevProps.document.template?.document ===
				nextProps.document.template?.document
		);
	},
);
