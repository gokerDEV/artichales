export type CitationEntry = {
	id: string;
	author: string;
	title: string;
	year: string;
	journal?: string;
};

export function parseBibtex(bibtex: string): Record<string, CitationEntry> {
	const entries = bibtex.split("@").slice(1);
	const citations: Record<string, CitationEntry> = {};

	for (const entry of entries) {
		const headerMatch = entry.match(/^(\w+)\{([^,]+),/);
		if (!headerMatch) continue;

		const id = headerMatch[2].trim();

		// Match properties (very basic parser)
		const authorMatch = entry.match(/author\s*=\s*[{"]([^}"]+)["}]/i);
		const yearMatch = entry.match(/year\s*=\s*[{"]([^}"]+)["}]/i);
		const titleMatch = entry.match(/title\s*=\s*[{"]([^}"]+)["}]/i);
		const journalMatch = entry.match(/journal\s*=\s*[{"]([^}"]+)["}]/i);

		citations[id] = {
			id,
			author: authorMatch
				? authorMatch[1].trim().replace(/\s+/g, " ")
				: "Unknown",
			title: titleMatch
				? titleMatch[1].trim().replace(/\s+/g, " ")
				: "Untitled",
			year: yearMatch ? yearMatch[1].trim() : "????",
			journal: journalMatch
				? journalMatch[1].trim().replace(/\s+/g, " ")
				: undefined,
		};
	}

	return citations;
}
