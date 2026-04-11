export function formatTemplateString(
	templateStr: string,
	frontmatter: Record<string, unknown>,
): string {
	if (!templateStr) return "";

	// Matches {title}, {journal.name}, etc.
	return templateStr.replace(/\{([^}]+)\}/g, (_, path) => {
		const keys = path.trim().split(".");
		let value: unknown = frontmatter;
		for (const key of keys) {
			if (!value || typeof value !== "object") return "";
			value = (value as Record<string, unknown>)[key];
		}
		return typeof value === "string" || typeof value === "number"
			? String(value)
			: "";
	});
}
