import { parse as parseYaml } from "yaml";
import { createParseDiagnostic } from "@/components/artichale/core/diagnostic";
import { createLastModifiedCache } from "@/components/artichale/core/last-modified.cache.ts";
import {
	type Frontmatter,
	type FrontmatterAuthor,
	FrontmatterSchema,
} from "@/components/artichale/schema/frontmatter.schema";
import type { ParseDiagnostic } from "@/components/artichale/types/pipeline.types";

const EMPTY_FRONTMATTER: Frontmatter = {
	title: "Untitled",
};
const frontmatterCache = createLastModifiedCache<ParseFrontmatterResult>();

function normalizeAuthors(
	authors: Frontmatter["authors"],
): FrontmatterAuthor[] | undefined {
	if (!authors) return undefined;
	if (typeof authors === "string") return [{ name: authors }];
	return authors.map((author) =>
		typeof author === "string" ? { name: author } : author,
	);
}

export type ParseFrontmatterResult = {
	frontmatter: Frontmatter;
	diagnostics: ParseDiagnostic[];
};

export function parseFrontmatter(
	rawFrontmatter: string,
	lastModified: string,
): ParseFrontmatterResult {
	const cached = frontmatterCache.get(lastModified);
	if (cached) return cached;

	let result: ParseFrontmatterResult;

	if (!rawFrontmatter || rawFrontmatter.trim() === "") {
		result = {
			frontmatter: EMPTY_FRONTMATTER,
			diagnostics: [
				createParseDiagnostic({
					code: "frontmatter-missing",
					severity: "error",
					message: "Frontmatter block is required.",
				}),
			],
		};
		frontmatterCache.set(lastModified, result);
		return result;
	}

	try {
		const parsed = parseYaml(rawFrontmatter);
		const candidate =
			typeof parsed === "object" && parsed !== null
				? (parsed as Record<string, unknown>)
				: {};
		const validated = FrontmatterSchema.safeParse(candidate);

		if (!validated.success) {
			const issueMessage =
				validated.error.issues[0]?.message ||
				"Frontmatter does not match required schema.";
			result = {
				frontmatter: EMPTY_FRONTMATTER,
				diagnostics: [
					createParseDiagnostic({
						code: "frontmatter-schema-invalid",
						severity: "error",
						message: `Frontmatter schema is invalid: ${issueMessage}`,
					}),
				],
			};
			frontmatterCache.set(lastModified, result);
			return result;
		}

		result = {
			frontmatter: {
				...validated.data,
				authors: normalizeAuthors(
					validated.data.authors,
				) as Frontmatter["authors"],
			},
			diagnostics: [],
		};
	} catch {
		result = {
			frontmatter: EMPTY_FRONTMATTER,
			diagnostics: [
				createParseDiagnostic({
					code: "frontmatter-invalid-yaml",
					severity: "error",
					message: "Frontmatter YAML is invalid.",
				}),
			],
		};
	}

	frontmatterCache.set(lastModified, result);
	return result;
}
