import type { ReactNode } from "react";
import { createLastModifiedCache } from "@/components/artichale/core/last-modified.cache";
import type { Frontmatter } from "@/components/artichale/schema/frontmatter.schema";
import type { TemplateResolved } from "@/components/artichale/types/template.types";

const titleRenderCache = createLastModifiedCache<ReactNode>();

export function renderTitle(input: {
	frontmatter: Frontmatter;
	template: TemplateResolved;
	lastModified: string;
}): ReactNode {
	const cached = titleRenderCache.get(input.lastModified);
	if (cached !== undefined) return cached;

	const titleBlock = input.template.print.titleBlock;
	if (!titleBlock.enabled) {
		titleRenderCache.set(input.lastModified, null);
		return null;
	}

	const alignClass =
		titleBlock.align === "left"
			? "text-left"
			: titleBlock.align === "right"
				? "text-right"
				: "text-center";

	const result = (
		<header className={`art-title ${alignClass}`}>
			{input.frontmatter.title || "Untitled"}
		</header>
	);

	titleRenderCache.set(input.lastModified, result);
	return result;
}
