import { createParseDiagnostic } from "@/components/artichale/core/diagnostic";
import type { ParseDiagnostic } from "@/components/artichale/types/pipeline.types";
import type {
	BibliographyById,
	BibliographyEntry,
} from "@/components/artichale/types/render.types";

type ParseBibliographyResult = {
	bibliography: BibliographyById;
	diagnostics: ParseDiagnostic[];
};

const ENTRY_PATTERN = /@(\w+)\s*\{\s*([^,\s]+)\s*,([\s\S]*?)\}\s*/g;
const FIELD_PATTERN =
	/(\w+)\s*=\s*(?:\{((?:[^{}]|\{[^{}]*\})*)\}|"([^"]*)"|([^,\n]+))\s*,?/g;

function cleanValue(value: string): string {
	return value.trim().replace(/\s+/g, " ");
}

function parseFields(rawFields: string): Record<string, string> {
	const fields: Record<string, string> = {};
	for (const match of rawFields.matchAll(FIELD_PATTERN)) {
		const key = match[1]?.trim().toLowerCase();
		const value = match[2] ?? match[3] ?? match[4];
		if (!key || !value) continue;
		fields[key] = cleanValue(value);
	}
	return fields;
}

function toBibliographyEntry(
	type: string,
	key: string,
	fields: Record<string, string>,
): BibliographyEntry {
	return {
		key,
		type: type.toLowerCase(),
		title: fields.title ?? key,
		author: fields.author,
		year: fields.year,
		journal: fields.journal,
		publisher: fields.publisher,
		url: fields.url,
		fields,
	};
}

export function parseBibliography({
	data,
	lastModified,
}: {
	data: string;
	lastModified: string;
}): ParseBibliographyResult {
	//  TODO:   memoize  by lastModified
	const bibliography: Record<string, BibliographyEntry> = {};
	const diagnostics: ParseDiagnostic[] = [];
	const source = data ?? "";

	for (const match of source.matchAll(ENTRY_PATTERN)) {
		const entryType = match[1]?.trim();
		const key = match[2]?.trim();
		const rawFields = match[3] ?? "";
		if (!entryType || !key) continue;

		if (bibliography[key]) {
			diagnostics.push(
				createParseDiagnostic({
					code: "bibliography-entry-invalid",
					severity: "error",
					message: `Duplicate bibliography key: "${key}".`,
				}),
			);
			continue;
		}

		const fields = parseFields(rawFields);
		if (!fields.title) {
			diagnostics.push(
				createParseDiagnostic({
					code: "bibliography-entry-invalid",
					severity: "warning",
					message: `Bibliography entry "${key}" is missing "title".`,
				}),
			);
		}

		bibliography[key] = toBibliographyEntry(entryType, key, fields);
	}

	return {
		bibliography,
		diagnostics,
	};
}
