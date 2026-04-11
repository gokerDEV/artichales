import type {
	CoreRenderHookContext,
	PluginDefinition,
} from "./plugin.contract";

function MarginLeftRenderer({ context }: { context: CoreRenderHookContext }) {
	if (context.target !== "print") return null;

	const f = context.document.frontmatter;
	const typeText =
		typeof f.type === "string" && f.type.trim() !== ""
			? f.type
			: "Research Article";
	const versionDate =
		typeof f.versionDate === "string" && f.versionDate.trim() !== ""
			? f.versionDate
			: null;

	return (
		<div
			className="ac-running-left flex h-full flex-col justify-end pb-[24mm] text-[9pt] text-muted-foreground/60 uppercase tracking-widest"
			style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
		>
			<span>{String(typeText)}</span>
			{versionDate ? <span className="mt-4">Rev: {versionDate}</span> : null}
			<span className="ac-page-counter mt-8 font-bold font-mono" />
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
