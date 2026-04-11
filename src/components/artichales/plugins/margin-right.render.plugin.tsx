import * as React from "react";
import type {
	CoreRenderHookContext,
	PluginDefinition,
} from "./plugin.contract";

function MarginRightRenderer({ context }: { context: CoreRenderHookContext }) {
	if (context.target !== "print") return null;

	const f = context.document.frontmatter as any;
	const conferenceInfo = f.conference?.name || f.journal?.name;

	return (
		<div
			className="ac-running-right flex h-full flex-col justify-end text-[9pt] text-muted-foreground/60 tracking-widest uppercase pb-[24mm]"
			style={{ writingMode: "vertical-rl" }}
		>
			<span>{String(conferenceInfo)}</span>
			<span className="ac-page-counter mt-8 font-mono font-bold" />
		</div>
	);
}

export const marginRightRenderPlugin: PluginDefinition = {
	id: "running-margin-right",
	category: "document",
	name: "Running Margin Right",
	hooks: {
		coreRender: (context) => (
			<MarginRightRenderer key="running-margin-right" context={context} />
		),
	},
};
