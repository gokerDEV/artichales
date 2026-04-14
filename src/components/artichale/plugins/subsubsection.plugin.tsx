import * as React from "react";
import { parseDirectiveNode } from "@/components/artichale/parser/directive.parser.ts";
import {
	extractReferenceNumber,
	toReadableTitle,
} from "@/components/artichale/base/plugin.shared.ts";
import type { PluginDefinition } from "@/components/artichale/types/plugin.types";
import {
	DirectiveKind,
	DisplayAs,
} from "@/components/artichale/types/plugin.types";

const SubsubsectionHeading = React.memo(
	function SubsubsectionHeading({ headingText }: { headingText: string }) {
		return <h4 className="art-subsubsection">{headingText}</h4>;
	},
	(previousProps, nextProps) =>
		previousProps.headingText === nextProps.headingText,
);

export const subsubsectionPlugin: PluginDefinition = {
	id: "subsubsection",
	name: "Subsubsection",
	displayAs: DisplayAs.SUBSUBSECTION,
	kind: DirectiveKind.CONTAINER,
	autocomplete: true,
	render({ node, resolvedReferences }) {
		const parsed = parseDirectiveNode(node);
		const title = toReadableTitle(
			parsed.label || parsed.dataFile || parsed.caption,
			"Subsubsection",
		);
		const number = extractReferenceNumber(resolvedReferences[parsed.id]);
		const headingText = number ? `${number} ${title}` : title;

		return <SubsubsectionHeading headingText={headingText} />;
	},
};
