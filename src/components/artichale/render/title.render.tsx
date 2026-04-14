import type { ReactNode } from "react";
import type { Frontmatter } from "@/components/artichale/schema/frontmatter.schema";
import type { TemplateResolved } from "@/components/artichale/types/template.types";

export function renderTitle(input: {
	frontmatter: Frontmatter;
	template: TemplateResolved;
}): ReactNode {
	const titleBlock = input.template.print.titleBlock;
	if (!titleBlock.enabled) return null;

	const alignClass =
		titleBlock.align === "left"
			? "text-left"
			: titleBlock.align === "right"
				? "text-right"
				: "text-center";

	return (
		<header className={`art-title ${alignClass}`}>
			{input.frontmatter.title || "Untitled"}
		</header>
	);
}
