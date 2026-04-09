import {
	type BibtexDiagnostic,
	parseRawBibtexEntries,
	type RawBibtexEntry,
} from "@/lib/bibtex.raw-parser";
import {
	ArticleBibSchema,
	BookBibSchema,
	isSupportedType,
	OnlineBibSchema,
	ProceedingsBibSchema,
	SUPPORTED_BIBTEX_TYPES,
	type SupportedBibtexType,
	type ValidatedBibEntry,
} from "@/lib/bibtex.types";

export { SUPPORTED_BIBTEX_TYPES };
export type { BibtexDiagnostic } from "@/lib/bibtex.raw-parser";
export type {
	ArticleBibEntry,
	BibEntryBase,
	BookBibEntry,
	OnlineBibEntry,
	ProceedingsBibEntry,
	SupportedBibtexType,
	ValidatedBibEntry,
} from "@/lib/bibtex.types";
export {
	ArticleBibSchema,
	BookBibSchema,
	OnlineBibSchema,
	ProceedingsBibSchema,
} from "@/lib/bibtex.types";

export type CitationEntry = {
	id: string;
	type: SupportedBibtexType;
	author: string;
	title: string;
	year: string;
	journal?: string;
};

export type BibtexParseResult = {
	citations: Record<string, CitationEntry>;
	validatedEntries: Record<string, ValidatedBibEntry>;
	diagnostics: BibtexDiagnostic[];
	hasError: boolean;
};

function normalizeOnlineAccessDate(
	fields: Record<string, string>,
): Record<string, string> {
	if (fields.accessed) return fields;
	const accessed = fields.urldate || fields.accessdate || fields["access-date"];
	return accessed ? { ...fields, accessed } : fields;
}

function schemaError(
	key: string,
	entryType: SupportedBibtexType,
	raw: RawBibtexEntry["fields"],
): BibtexDiagnostic | undefined {
	const normalized =
		entryType === "online" ? normalizeOnlineAccessDate(raw) : raw;
	if (entryType === "online" && !normalized.accessed) {
		return {
			code: "bibtex-online-missing-access-date",
			severity: "error",
			message: `Online entry "${key}" must define an access date field.`,
		};
	}

	const parsed =
		entryType === "book"
			? BookBibSchema.safeParse(normalized)
			: entryType === "article"
				? ArticleBibSchema.safeParse(normalized)
				: entryType === "proceedings"
					? ProceedingsBibSchema.safeParse(normalized)
					: OnlineBibSchema.safeParse(normalized);

	if (parsed.success) return undefined;
	const invalidFields = parsed.error.issues
		.map((issue) => issue.path.join("."))
		.filter(Boolean)
		.join(", ");
	return {
		code: "bibtex-schema-invalid",
		severity: "error",
		message: invalidFields
			? `Entry "${key}" failed ${entryType} schema validation (${invalidFields}).`
			: `Entry "${key}" failed ${entryType} schema validation.`,
	};
}

function validateTypedEntry(raw: RawBibtexEntry): {
	entry?: ValidatedBibEntry;
	diagnostic?: BibtexDiagnostic;
} {
	if (!isSupportedType(raw.type)) {
		return {
			diagnostic: {
				code: "bibtex-unsupported-entry-type",
				severity: "error",
				message: `Unsupported BibTeX entry type "${raw.type}" for key "${raw.key}".`,
			},
		};
	}

	const diagnostic = schemaError(raw.key, raw.type, raw.fields);
	if (diagnostic) return { diagnostic };

	if (raw.type === "online") {
		const parsed = OnlineBibSchema.parse(normalizeOnlineAccessDate(raw.fields));
		return { entry: { key: raw.key, type: "online", ...parsed } };
	}
	if (raw.type === "book") {
		const parsed = BookBibSchema.parse(raw.fields);
		return { entry: { key: raw.key, type: "book", ...parsed } };
	}
	if (raw.type === "article") {
		const parsed = ArticleBibSchema.parse(raw.fields);
		return { entry: { key: raw.key, type: "article", ...parsed } };
	}
	const parsed = ProceedingsBibSchema.parse(raw.fields);
	return { entry: { key: raw.key, type: "proceedings", ...parsed } };
}

function toCitationEntry(entry: ValidatedBibEntry): CitationEntry {
	const author = "author" in entry ? entry.author : "Unknown";
	const year = "year" in entry ? entry.year : "????";
	const journal =
		entry.type === "article"
			? entry.journal
			: entry.type === "book"
				? entry.publisher
				: entry.type === "online"
					? entry.url
					: undefined;

	return {
		id: entry.key,
		type: entry.type,
		author,
		title: entry.title,
		year,
		journal,
	};
}

export function parseBibtexDocument(bibtex: string): BibtexParseResult {
	const { entries, diagnostics: parserDiagnostics } =
		parseRawBibtexEntries(bibtex);
	const diagnostics: BibtexDiagnostic[] = [...parserDiagnostics];
	const citations: Record<string, CitationEntry> = {};
	const validatedEntries: Record<string, ValidatedBibEntry> = {};

	for (const raw of entries) {
		if (validatedEntries[raw.key]) {
			diagnostics.push({
				code: "bibtex-duplicate-key",
				severity: "error",
				message: `Duplicate BibTeX key detected: "${raw.key}".`,
			});
			continue;
		}

		const validated = validateTypedEntry(raw);
		if (validated.diagnostic) {
			diagnostics.push(validated.diagnostic);
			continue;
		}
		if (!validated.entry) continue;

		validatedEntries[validated.entry.key] = validated.entry;
		citations[validated.entry.key] = toCitationEntry(validated.entry);
	}

	return {
		citations,
		validatedEntries,
		diagnostics,
		hasError: diagnostics.some((diag) => diag.severity === "error"),
	};
}

export function parseBibtex(bibtex: string): Record<string, CitationEntry> {
	return parseBibtexDocument(bibtex).citations;
}
