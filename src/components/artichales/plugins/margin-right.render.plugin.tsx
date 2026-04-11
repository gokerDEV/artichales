import type {
	CoreRenderHookContext,
	PluginDefinition,
} from "./plugin.contract";

function MarginRightRenderer({ context }: { context: CoreRenderHookContext }) {
	if (context.target !== "print") return null;

	const f = context.document.frontmatter;
	const conference =
		f.conference && typeof f.conference === "object"
			? (f.conference as Record<string, unknown>)
			: null;
	const journal =
		f.journal && typeof f.journal === "object"
			? (f.journal as Record<string, unknown>)
			: null;
	const conferenceInfo =
		(typeof conference?.name === "string" && conference.name.trim() !== ""
			? conference.name
			: undefined) ||
		(typeof journal?.name === "string" && journal.name.trim() !== ""
			? journal.name
			: undefined) ||
		"";

	return (
		<div
			className="ac-running-right flex h-full flex-col justify-end pb-[24mm] text-[9pt] text-muted-foreground/60 uppercase tracking-widest"
			style={{ writingMode: "vertical-rl" }}
		>
			<span>{conferenceInfo}</span>
			<span className="ac-page-counter mt-8 font-bold font-mono" />
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
