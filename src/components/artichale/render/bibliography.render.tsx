import type { ReactNode } from "react";
import { createLastModifiedCache } from "@/components/artichale/core/last-modified.cache";
import type { BibliographyById } from "@/components/artichale/types/render.types";
import type { TemplateResolved } from "@/components/artichale/types/template.types";

const bibliographyRenderCache = createLastModifiedCache<ReactNode>();

function sortCitations(
	citationIds: readonly string[],
	style: TemplateResolved["default"]["citationStyle"],
): string[] {
	if (style === "author-year" || style === "apa") {
		return [...citationIds].sort((left, right) => left.localeCompare(right));
	}
	return [...citationIds];
}

export function renderBibliography(input: {
	bibliography: BibliographyById;
	citations: readonly string[];
	template: TemplateResolved;
	lastModified: string;
}): ReactNode {
	const cached = bibliographyRenderCache.get(input.lastModified);
	if (cached !== undefined) return cached;

	const orderedIds = sortCitations(
		input.citations,
		input.template.default.citationStyle,
	);
	const entries = orderedIds
		.map((id) => input.bibliography[id])
		.filter((entry) => Boolean(entry));

	if (entries.length === 0) {
		bibliographyRenderCache.set(input.lastModified, null);
		return null;
	}

	const result = (
		<section className="art-references">
			<h2 className="art-references-title">References</h2>
			<ol>
				{entries.map((entry, index) => (
					<li
						key={entry.key}
						id={`ref-${entry.key}`}
						className="art-reference-item"
					>
						<span>[{index + 1}] </span>
						{entry.author ? <span>{entry.author}. </span> : null}
						<span>
							<em>{entry.title}</em>.
						</span>
						{entry.journal ? <span> {entry.journal},</span> : null}
						{entry.publisher ? <span> {entry.publisher},</span> : null}
						{entry.year ? <span> {entry.year}.</span> : null}
					</li>
				))}
			</ol>
		</section>
	);

	bibliographyRenderCache.set(input.lastModified, result);
	return result;
}
