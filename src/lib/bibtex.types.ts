import { z } from "zod";

export const SUPPORTED_BIBTEX_TYPES = [
	"book",
	"article",
	"proceedings",
	"online",
] as const;

export type SupportedBibtexType = (typeof SUPPORTED_BIBTEX_TYPES)[number];

export interface BibEntryBase {
	key: string;
	type: SupportedBibtexType;
	title: string;
}

export interface BookBibEntry extends BibEntryBase {
	type: "book";
	author: string;
	publisher: string;
	year: string;
}

export interface ArticleBibEntry extends BibEntryBase {
	type: "article";
	author: string;
	journal: string;
	year: string;
}

export interface ProceedingsBibEntry extends BibEntryBase {
	type: "proceedings";
	year: string;
}

export interface OnlineBibEntry extends BibEntryBase {
	type: "online";
	url: string;
	accessed: string;
}

export type ValidatedBibEntry =
	| BookBibEntry
	| ArticleBibEntry
	| ProceedingsBibEntry
	| OnlineBibEntry;

const NonEmptyString = z.string().trim().min(1);
const BibBaseSchema = z.object({
	title: NonEmptyString,
});

export const BookBibSchema = BibBaseSchema.extend({
	author: NonEmptyString,
	publisher: NonEmptyString,
	year: NonEmptyString,
}).passthrough();

export const ArticleBibSchema = BibBaseSchema.extend({
	author: NonEmptyString,
	journal: NonEmptyString,
	year: NonEmptyString,
}).passthrough();

export const ProceedingsBibSchema = BibBaseSchema.extend({
	year: NonEmptyString,
}).passthrough();

export const OnlineBibSchema = BibBaseSchema.extend({
	url: NonEmptyString,
	accessed: NonEmptyString,
}).passthrough();

export function isSupportedType(type: string): type is SupportedBibtexType {
	return SUPPORTED_BIBTEX_TYPES.includes(type as SupportedBibtexType);
}
