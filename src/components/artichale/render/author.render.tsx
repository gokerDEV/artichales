import type { ReactNode } from "react";
import { createLastModifiedCache } from "@/components/artichale/core/last-modified.cache";
import type { Frontmatter } from "@/components/artichale/schema/frontmatter.schema";
import type { TemplateResolved } from "@/components/artichale/types/template.types";

const authorsRenderCache = createLastModifiedCache<ReactNode>();

type NormalizedAuthor = {
	name: string;
	affiliation?: string | null;
	orcid?: string | null;
	email?: string;
};

function firstString(
	value: string | readonly string[] | null | undefined,
): string | undefined {
	if (!value) return undefined;
	if (typeof value === "string") return value;
	return value[0];
}

function normalizeAuthors(authors: Frontmatter["authors"]): NormalizedAuthor[] {
	if (!authors) return [];
	if (typeof authors === "string") return [{ name: authors }];
	return authors.map((author) =>
		typeof author === "string"
			? { name: author }
			: {
					name: author.name,
					affiliation: author.affiliation,
					orcid: author.orcid,
					email: firstString(author.email),
				},
	);
}

export function renderAuthors(input: {
	frontmatter: Frontmatter;
	template: TemplateResolved;
	lastModified: string;
}): ReactNode {
	const cached = authorsRenderCache.get(input.lastModified);
	if (cached !== undefined) return cached;

	const titleBlock = input.template.print.titleBlock;
	if (!titleBlock.enabled || !titleBlock.showAuthors) {
		authorsRenderCache.set(input.lastModified, null);
		return null;
	}

	const authors = normalizeAuthors(input.frontmatter.authors);
	if (authors.length === 0) {
		authorsRenderCache.set(input.lastModified, null);
		return null;
	}

	const result = (
		<section className="art-author">
			{authors.map((author) => (
				<div key={`${author.name}-${author.email ?? ""}`}>
					<div className="art-author-name">{author.name}</div>
					{titleBlock.showAffiliations && author.affiliation ? (
						<div className="art-author-affiliation">{author.affiliation}</div>
					) : null}
				</div>
			))}
		</section>
	);

	authorsRenderCache.set(input.lastModified, result);
	return result;
}
