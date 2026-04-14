import type {
	DirectiveComponentProps,
	DirectiveRendererDefinition,
	PluginDefinition,
	RenderHookContext,
} from "./plugin.contract";

function normalizeLabelKey(raw: string): string {
	return raw
		.trim()
		.replace(/\.[^/.]+$/, "")
		.toLowerCase();
}

function toAnchorId(rawLabel: string, prefix: string): string {
	const normalized = rawLabel
		.trim()
		.replace(/\.[^/.]+$/, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return normalized ? `${prefix}-${normalized}` : "";
}

function toReadableTitle(rawLabel: string): string {
	const cleaned = rawLabel
		.trim()
		.replace(/\.[^/.]+$/, "")
		.replace(/[_-]+/g, " ")
		.trim();
	if (!cleaned) return "Section";
	return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function extractReferenceNumber(
	resolvedLabel: string | undefined,
	fallback: string,
): string {
	if (!resolvedLabel) return fallback;
	const match = resolvedLabel.match(/(\d+(?:\.\d+)*)$/);
	return match?.[1] ?? fallback;
}

function createSectionRenderer(
	kind: "section" | "subsection" | "subsubsection",
	level: 2 | 3 | 4,
	resolvedReferences: RenderHookContext["resolvedReferences"],
) {
	const HeadingTag = `h${level}` as unknown as "h2" | "h3" | "h4";
	return function SectionRenderer({
		params,
		children,
		...rest
	}: DirectiveComponentProps) {
		const label = params.data_file ?? "";
		const normalized = normalizeLabelKey(label);
		const selector = normalized ? `${kind}:${normalized}` : "";
		const headingText = toReadableTitle(label);
		const reference = selector ? resolvedReferences[selector] : undefined;
		const number = extractReferenceNumber(reference?.label, "");
		return (
			<section
				{...rest}
				id={toAnchorId(label, kind) || undefined}
				className={`art-${kind} ${kind === "section" ? "my-4" : kind === "subsection" ? "my-3" : "my-2"}`}
			>
				<HeadingTag
					className={
						kind === "section"
							? "mb-2 font-semibold text-2xl"
							: kind === "subsection"
								? "mb-2 font-semibold text-xl"
								: "mb-1 font-semibold text-lg"
					}
				>
					{number ? `${number} ` : ""}
					{headingText}
				</HeadingTag>
				{children}
			</section>
		);
	};
}

function registerSectionRenderRuntime(
	context: RenderHookContext,
): DirectiveRendererDefinition {
	return {
		directive: "section",
		category: "document",
		component: createSectionRenderer("section", 2, context.resolvedReferences),
	};
}

function registerSubsectionRenderRuntime(
	context: RenderHookContext,
): DirectiveRendererDefinition {
	return {
		directive: "subsection",
		category: "document",
		component: createSectionRenderer(
			"subsection",
			3,
			context.resolvedReferences,
		),
	};
}

function registerSubsubsectionRenderRuntime(
	context: RenderHookContext,
): DirectiveRendererDefinition {
	return {
		directive: "subsubsection",
		category: "document",
		component: createSectionRenderer(
			"subsubsection",
			4,
			context.resolvedReferences,
		),
	};
}

export const sectionDirectivePlugin: PluginDefinition = {
	id: "section",
	name: "Section",
	category: "document",
	displayAs: "section",
	kind: "container",
	autocomplete: true,
	hooks: {
		directiveRender: registerSectionRenderRuntime,
	},
};

export const subsectionDirectivePlugin: PluginDefinition = {
	id: "subsection",
	name: "Subsection",
	category: "document",
	displayAs: "section",
	kind: "container",
	autocomplete: true,
	hooks: {
		directiveRender: registerSubsectionRenderRuntime,
	},
};

export const subsubsectionDirectivePlugin: PluginDefinition = {
	id: "subsubsection",
	name: "Subsubsection",
	category: "document",
	displayAs: "section",
	kind: "container",
	autocomplete: true,
	hooks: {
		directiveRender: registerSubsubsectionRenderRuntime,
	},
};
