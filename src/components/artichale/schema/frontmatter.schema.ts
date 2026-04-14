import { z } from "zod";

const OptionalStringSchema = z.union([z.string(), z.null()]).optional();
const OptionalStringOrArraySchema = z
	.union([z.string(), z.array(z.string()), z.null()])
	.optional();

export const FrontmatterAuthorSchema = z
	.object({
		name: z.string().trim().min(1),
		affiliation: OptionalStringSchema,
		orcid: OptionalStringSchema,
		email: OptionalStringOrArraySchema,
		url: OptionalStringOrArraySchema,
		address: OptionalStringOrArraySchema,
		corresponding: z.boolean().optional(),
	})
	.strict();

export const FrontmatterLicenseSchema = z
	.object({
		name: OptionalStringSchema,
		text: OptionalStringSchema,
		url: OptionalStringSchema,
	})
	.strict();

export const FrontmatterJournalSchema = z
	.object({
		name: OptionalStringSchema,
		issn: OptionalStringSchema,
		eissn: OptionalStringSchema,
		volume: z.union([z.string(), z.number(), z.null()]).optional(),
		issue: z.union([z.string(), z.number(), z.null()]).optional(),
		pages: OptionalStringSchema,
	})
	.strict();

export const FrontmatterConferenceSchema = z
	.object({
		name: OptionalStringSchema,
		location: OptionalStringSchema,
		date: OptionalStringSchema,
		proceedings: OptionalStringSchema,
		pages: OptionalStringSchema,
	})
	.strict();

const FrontmatterAuthorValueSchema = z.union([
	z.string().trim().min(1),
	FrontmatterAuthorSchema,
]);

export const FrontmatterSchema = z
	.object({
		title: z.string().trim().min(1),
		shortTitle: OptionalStringSchema,
		authors: z
			.union([z.string().trim().min(1), z.array(FrontmatterAuthorValueSchema)])
			.optional(),
		keywords: z.array(z.string().trim().min(1)).optional(),
		doi: OptionalStringSchema,
		receivedAt: OptionalStringSchema,
		acceptedAt: OptionalStringSchema,
		publishedAt: OptionalStringSchema,
		versionDate: OptionalStringSchema,
		type: OptionalStringSchema,
		license: FrontmatterLicenseSchema.optional(),
		journal: FrontmatterJournalSchema.optional(),
		conference: FrontmatterConferenceSchema.optional(),
		editors: z.array(FrontmatterAuthorSchema).optional(),
	})
	.strict();

export type Frontmatter = z.infer<typeof FrontmatterSchema>;
export type FrontmatterAuthor = z.infer<typeof FrontmatterAuthorSchema>;
