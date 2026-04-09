export type CitationEntry = {
	id: string;
	author: string;
	title: string;
	year: string;
	journal?: string;
};

export type BibtexDiagnostic = {
	code: "bibtex-syntax-invalid" | "bibtex-duplicate-key";
	severity: "error" | "warning";
	message: string;
};

export type BibtexParseResult = {
	citations: Record<string, CitationEntry>;
	diagnostics: BibtexDiagnostic[];
	hasError: boolean;
};

export function parseBibtexDocument(bibtex: string): BibtexParseResult {
	const entries = bibtex.split("@").slice(1);
	const citations: Record<string, CitationEntry> = {};
	const diagnostics: BibtexDiagnostic[] = [];

	for (const entry of entries) {
		const headerMatch = entry.match(/^(\w+)\{([^,]+),/);
		if (!headerMatch) {
			diagnostics.push({
				code: "bibtex-syntax-invalid",
				severity: "error",
				message: "Invalid BibTeX entry header detected in `references.bib`.",
			});
			continue;
		}

		const id = headerMatch[2].trim();
		if (citations[id]) {
			diagnostics.push({
				code: "bibtex-duplicate-key",
				severity: "error",
				message: `Duplicate BibTeX key detected: "${id}".`,
			});
			continue;
		}

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

	return {
		citations,
		diagnostics,
		hasError: diagnostics.some((diag) => diag.severity === "error"),
	};
}

export function parseBibtex(bibtex: string): Record<string, CitationEntry> {
	return parseBibtexDocument(bibtex).citations;
}
