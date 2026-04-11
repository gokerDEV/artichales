import * as React from "react";
import type {
	CoreRenderHookContext,
	PluginDefinition,
} from "./plugin.contract";

function MarginLeftRenderer({ context }: { context: CoreRenderHookContext }) {
	if (context.target !== "print") return null;

	const f = context.document.frontmatter as any;
	const typeText = f.type || "Research Article";

	return (
		<div
			className="ac-running-left flex h-full flex-col justify-end text-[9pt] text-muted-foreground/60 tracking-widest uppercase pb-[24mm]"
			style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
		>
			<span>{String(typeText)}</span>
			{f.versionDate ? (
				<span className="mt-4">Rev: {String(f.versionDate)}</span>
			) : null}
			<span className="ac-page-counter mt-8 font-mono font-bold" />
		</div>
	);
}

export const marginLeftRenderPlugin: PluginDefinition = {
	id: "running-margin-left",
	category: "document",
	name: "Running Margin Left",
	hooks: {
		coreRender: (context) => (
			<MarginLeftRenderer key="running-margin-left" context={context} />
		),
	},
};
