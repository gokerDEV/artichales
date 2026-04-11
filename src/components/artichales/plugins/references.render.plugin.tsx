import * as React from "react";
import type { DocumentSource } from "@/hooks/use-document";
import { cn } from "@/lib/utils";
import type {
	CoreRenderHookContext,
	PluginDefinition,
} from "./plugin.contract";

function renderReferencesCore(context: CoreRenderHookContext) {
	return (
		<ReferencesRenderPlugin
			document={context.document}
			target={context.target}
			className={context.className}
		/>
	);
}

export const referencesRenderPlugin: PluginDefinition = {
	id: "references",
	category: "references",
	name: "References",
	hooks: {
		coreRender: renderReferencesCore,
	},
};

export const ReferencesRenderPlugin = React.memo(
	function ReferencesRenderPlugin({
		document,
		target,
		className,
	}: {
		document: DocumentSource;
		target: "web" | "print";
		className?: string;
	}) {
		const { template, citations } = document;
		const isPrint = target === "print";
		const docStyle = template?.document || {};

		if (Object.keys(citations).length === 0) return null;

		return (
			<div
				className={cn("mt-8 border-t pt-8", isPrint ? "pt-6" : "", className)}
				style={{ borderColor: "var(--art-border-color)" }}
			>
				<h2
					className={cn(
						"font-semibold",
						isPrint ? "mb-4 text-sm" : "mb-6 text-xl",
					)}
					style={{
						color: "var(--art-text-color)",
						fontFamily: docStyle.fontFamily?.heading,
					}}
				>
					{"References"}
				</h2>
				<div className="flex flex-col gap-2">
					{Object.values(citations).map((ref, idx) => (
						<div
							key={ref.id}
							id={`ref-${ref.id}`}
							className={cn(
								"flex gap-4",
								isPrint
									? "text-[10px] leading-relaxed"
									: "text-sm leading-relaxed",
							)}
							style={{ color: "var(--art-muted-color)" }}
						>
							<span
								className="shrink-0 font-medium"
								style={{ color: "var(--art-text-color)" }}
							>
								[{idx + 1}]
							</span>
							<span>
								{ref.author && <span className="mr-1">{ref.author}.</span>}
								{ref.title && (
									<span className="mr-1 font-medium italic">{ref.title}.</span>
								)}
								{ref.journal && <span className="mr-1">{ref.journal},</span>}
								{ref.year && <span>{ref.year}.</span>}
							</span>
						</div>
					))}
				</div>
			</div>
		);
	},
	(prevProps, nextProps) => {
		return (
			prevProps.target === nextProps.target &&
			prevProps.className === nextProps.className &&
			prevProps.document.citations === nextProps.document.citations &&
			prevProps.document.template?.document ===
				nextProps.document.template?.document
		);
	},
);
