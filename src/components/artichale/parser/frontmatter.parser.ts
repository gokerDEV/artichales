import { parse as parseYaml } from "yaml";
import { createParseDiagnostic } from "@/components/artichale/core/diagnostic";
import {
	type Frontmatter,
	type FrontmatterAuthor,
	FrontmatterSchema,
} from "@/components/artichale/schema/frontmatter.schema";
import type { ParseDiagnostic } from "@/components/artichale/types/pipeline.types";

const EMPTY_FRONTMATTER: Frontmatter = {
	title: "Untitled",
};

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
	rawFrontmatter?: string,
	lastModified: string,
): ParseFrontmatterResult {
	//  TODO:   memoize  by lastModified
	if (!rawFrontmatter || rawFrontmatter.trim() === "") {
		return {
			frontmatter: EMPTY_FRONTMATTER,
			diagnostics: [
				createParseDiagnostic({
					code: "frontmatter-missing",
					severity: "error",
					message: "Frontmatter block is required.",
				}),
			],
		};
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
			return {
				frontmatter: EMPTY_FRONTMATTER,
				diagnostics: [
					createParseDiagnostic({
						code: "frontmatter-schema-invalid",
						severity: "error",
						message: `Frontmatter schema is invalid: ${issueMessage}`,
					}),
				],
			};
		}

		return {
			frontmatter: {
				...validated.data,
				authors: normalizeAuthors(
					validated.data.authors,
				) as Frontmatter["authors"],
			},
			diagnostics: [],
		};
	} catch {
		return {
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
}
