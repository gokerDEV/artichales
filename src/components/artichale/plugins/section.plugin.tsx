import * as React from "react";
import {
	extractReferenceNumber,
	toReadableTitle,
} from "@/components/artichale/base/plugin.shared.ts";
import { parseDirectiveNode } from "@/components/artichale/core/artichale.util";
import type { PluginDefinition } from "@/components/artichale/types/plugin.types";
import {
	DirectiveKind,
	DisplayAs,
} from "@/components/artichale/types/plugin.types";

const SectionHeading = React.memo(
	function SectionHeading({ headingText }: { headingText: string }) {
		return <h2 className="art-section">{headingText}</h2>;
	},
	(previousProps, nextProps) =>
		previousProps.headingText === nextProps.headingText,
);

export const sectionPlugin: PluginDefinition = {
	id: "section",
	name: "Section",
	displayAs: DisplayAs.SECTION,
	kind: DirectiveKind.CONTAINER,
	autocomplete: true,
	render({ node, resolvedReferences }) {
		const parsed = parseDirectiveNode(node);
		const title = toReadableTitle(
			parsed.label || parsed.dataFile || parsed.caption,
			"Section",
		);
		const number = extractReferenceNumber(resolvedReferences.get(parsed.id));
		const headingText = number ? `${number} ${title}` : title;

		return <SectionHeading headingText={headingText} />;
	},
};
