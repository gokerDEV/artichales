import { parseDirectiveNode } from "@/components/artichale/core/artichale.util";
import type { PluginDefinition } from "@/components/artichale/types/plugin.types";
import {
	DirectiveKind,
	DisplayAs,
} from "@/components/artichale/types/plugin.types";

function headingLevelFor(id: string): "h2" | "h3" | "h4" {
	if (id === "section") return "h2";
	if (id === "subsection") return "h3";
	return "h4";
}

function headingClassFor(id: string): string {
	if (id === "section") return "text-2xl";
	if (id === "subsection") return "text-xl";
	return "text-lg";
}

function createSectionPlugin(
	id: "section" | "subsection" | "subsubsection",
	name: string,
	displayAs: DisplayAs,
): PluginDefinition {
	return {
		id,
		name,
		displayAs,
		kind: DirectiveKind.CONTAINER,
		autocomplete: true,
		render({ node }) {
			const parsed = parseDirectiveNode(node);
			const title = parsed.caption || parsed.label || parsed.dataFile || name;
			const HeadingTag = headingLevelFor(id);

			return (
				<section id={parsed.id.replaceAll(":", "-")} className={`art-${id}`}>
					<HeadingTag className={headingClassFor(id)}>{title}</HeadingTag>
				</section>
			);
		},
	};
}

export const sectionPlugin = createSectionPlugin(
	"section",
	"Section",
	DisplayAs.SECTION,
);

export const subsectionPlugin = createSectionPlugin(
	"subsection",
	"Subsection",
	DisplayAs.SUBSECTION,
);

export const subsubsectionPlugin = createSectionPlugin(
	"subsubsection",
	"Subsubsection",
	DisplayAs.SUBSUBSECTION,
);
