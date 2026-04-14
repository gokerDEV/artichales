import type { CSSProperties, ReactNode } from "react";
import type { TemplateResolved } from "@/components/artichale/types/template.types";

import "@/components/artichale/base/base.template.print.css";
import "@/components/artichale/base/print.mechanics.css";

export type ArtichaleViewProps = {
	template: TemplateResolved;
	title: ReactNode;
	authors: ReactNode;
	article: ReactNode;
	references: ReactNode;
};

function buildStyleVars(template: TemplateResolved): CSSProperties {
	return {
		"--art-font-body": template.default.typography.fontFamily.body,
		"--art-font-heading": template.default.typography.fontFamily.heading,
		"--art-font-mono": template.default.typography.fontFamily.mono,
		"--art-font-size-body": template.default.typography.fontSize.body,
		"--art-font-size-h1": template.default.typography.fontSize.h1,
		"--art-font-size-h2": template.default.typography.fontSize.h2,
		"--art-font-size-h3": template.default.typography.fontSize.h3,
		"--art-line-height": String(template.default.typography.lineHeight),
		"--art-text-color": template.default.colors.text,
		"--art-muted-color": template.default.colors.muted,
		"--art-border-color": template.default.colors.border,
		"--art-link-color": template.default.colors.link,
	} as CSSProperties;
}

export function ArtichaleView(props: ArtichaleViewProps) {
	return (
		<div
			id="artichale"
			className="artichale"
			// Print-only composition container.
			data-art-print-document="true"
			style={buildStyleVars(props.template)}
		>
			{props.title}
			{props.authors}
			{props.article}
			{props.references}
		</div>
	);
}
