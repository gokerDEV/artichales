export type RawBibtexEntry = {
	type: string;
	key: string;
	fields: Record<string, string>;
};

export type BibtexDiagnostic = {
	code:
		| "bibtex-syntax-invalid"
		| "bibtex-duplicate-key"
		| "bibtex-unsupported-entry-type"
		| "bibtex-schema-invalid"
		| "bibtex-online-missing-access-date";
	severity: "error" | "warning";
	message: string;
};

function stripWrappedValue(value: string): string {
	const v = value.trim();
	if (
		(v.startsWith("{") && v.endsWith("}")) ||
		(v.startsWith('"') && v.endsWith('"'))
	) {
		return v.slice(1, -1).trim();
	}
	return v;
}

function findMatchingBrace(input: string, openIndex: number): number {
	let depth = 0;
	let inQuotes = false;
	for (let index = openIndex; index < input.length; index += 1) {
		const char = input[index];
		const prev = index > 0 ? input[index - 1] : "";
		if (char === '"' && prev !== "\\") {
			inQuotes = !inQuotes;
			continue;
		}
		if (inQuotes) continue;
		if (char === "{") depth += 1;
		if (char === "}") {
			depth -= 1;
			if (depth === 0) return index;
		}
	}
	return -1;
}

function findTopLevelComma(input: string): number {
	let depth = 0;
	let inQuotes = false;
	for (let index = 0; index < input.length; index += 1) {
		const char = input[index];
		const prev = index > 0 ? input[index - 1] : "";
		if (char === '"' && prev !== "\\") {
			inQuotes = !inQuotes;
			continue;
		}
		if (inQuotes) continue;
		if (char === "{") depth += 1;
		if (char === "}") depth = Math.max(0, depth - 1);
		if (char === "," && depth === 0) return index;
	}
	return -1;
}

function parseFields(input: string): Record<string, string> | null {
	const fields: Record<string, string> = {};
	let cursor = 0;

	while (cursor < input.length) {
		while (cursor < input.length && /[\s,\n\r\t]/.test(input[cursor])) {
			cursor += 1;
		}
		if (cursor >= input.length) break;

		const keyStart = cursor;
		while (cursor < input.length && /[\w-]/.test(input[cursor])) cursor += 1;
		const key = input.slice(keyStart, cursor).trim().toLowerCase();
		if (!key) return null;

		while (cursor < input.length && /\s/.test(input[cursor])) cursor += 1;
		if (input[cursor] !== "=") return null;
		cursor += 1;
		while (cursor < input.length && /\s/.test(input[cursor])) cursor += 1;
		if (cursor >= input.length) return null;

		let rawValue = "";
		if (input[cursor] === "{") {
			const end = findMatchingBrace(input, cursor);
			if (end === -1) return null;
			rawValue = input.slice(cursor, end + 1);
			cursor = end + 1;
		} else if (input[cursor] === '"') {
			let end = cursor + 1;
			while (end < input.length) {
				if (input[end] === '"' && input[end - 1] !== "\\") break;
				end += 1;
			}
			if (end >= input.length) return null;
			rawValue = input.slice(cursor, end + 1);
			cursor = end + 1;
		} else {
			const start = cursor;
			while (cursor < input.length && input[cursor] !== ",") cursor += 1;
			rawValue = input.slice(start, cursor);
		}

		fields[key] = stripWrappedValue(rawValue).replace(/\s+/g, " ");
	}

	return fields;
}

export function parseRawBibtexEntries(bibtex: string): {
	entries: RawBibtexEntry[];
	diagnostics: BibtexDiagnostic[];
} {
	const entries: RawBibtexEntry[] = [];
	const diagnostics: BibtexDiagnostic[] = [];
	let cursor = 0;

	while (cursor < bibtex.length) {
		const at = bibtex.indexOf("@", cursor);
		if (at === -1) break;

		let typeEnd = at + 1;
		while (typeEnd < bibtex.length && /[A-Za-z]/.test(bibtex[typeEnd])) {
			typeEnd += 1;
		}
		const type = bibtex
			.slice(at + 1, typeEnd)
			.trim()
			.toLowerCase();

		while (typeEnd < bibtex.length && /\s/.test(bibtex[typeEnd])) {
			typeEnd += 1;
		}
		if (bibtex[typeEnd] !== "{") {
			diagnostics.push({
				code: "bibtex-syntax-invalid",
				severity: "error",
				message: "Invalid BibTeX entry header detected in `references.bib`.",
			});
			cursor = at + 1;
			continue;
		}

		const end = findMatchingBrace(bibtex, typeEnd);
		if (end === -1) {
			diagnostics.push({
				code: "bibtex-syntax-invalid",
				severity: "error",
				message: "Unclosed BibTeX entry detected in `references.bib`.",
			});
			break;
		}

		const body = bibtex.slice(typeEnd + 1, end).trim();
		const split = findTopLevelComma(body);
		if (split === -1) {
			diagnostics.push({
				code: "bibtex-syntax-invalid",
				severity: "error",
				message: "BibTeX entry is missing key/field separator comma.",
			});
			cursor = end + 1;
			continue;
		}

		const key = body.slice(0, split).trim();
		const fields = parseFields(body.slice(split + 1).trim());
		if (!key || !fields) {
			diagnostics.push({
				code: "bibtex-syntax-invalid",
				severity: "error",
				message: "BibTeX entry fields could not be parsed.",
			});
			cursor = end + 1;
			continue;
		}

		entries.push({ type, key, fields });
		cursor = end + 1;
	}

	return { entries, diagnostics };
}
