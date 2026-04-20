import * as React from "react";
import {
	extractReferenceNumber,
	toReadableTitle,
} from "@/components/artichale/core/plugin.shared.ts";
import { parseDirectiveNode } from "@/components/artichale/core/artichale.util";
import type { PluginDefinition } from "@/components/artichale/types/plugin.types";
import {
	DirectiveKind,
	DisplayAs,
} from "@/components/artichale/types/plugin.types";

const SubsectionHeading = React.memo(
	function SubsectionHeading({ headingText }: { headingText: string }) {
		return <h3 className="art-subsection">{headingText}</h3>;
	},
	(previousProps, nextProps) =>
		previousProps.headingText === nextProps.headingText,
);

export const subsectionPlugin: PluginDefinition = {
	id: "subsection",
	name: "Subsection",
	displayAs: DisplayAs.SUBSECTION,
	kind: DirectiveKind.CONTAINER,
	autocomplete: true,
	render({ node, resolvedReferences }) {
		const parsed = parseDirectiveNode(node);
		const title = toReadableTitle(
			parsed.label || parsed.dataFile || parsed.caption,
			"Subsection",
		);
		const number = extractReferenceNumber(resolvedReferences.get(parsed.id));
		const headingText = number ? `${number} ${title}` : title;

		return <SubsectionHeading headingText={headingText} />;
	},
};
