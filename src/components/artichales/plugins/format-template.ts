export function formatTemplateString(
	templateStr: string,
	frontmatter: Record<string, any>,
): string {
	if (!templateStr) return "";

	// Matches {title}, {journal.name}, etc.
	return templateStr.replace(/\{([^}]+)\}/g, (_, path) => {
		const keys = path.trim().split(".");
		let value = frontmatter;
		for (const key of keys) {
			if (value == null) return "";
			value = value[key];
		}
		return typeof value === "string" || typeof value === "number"
			? String(value)
			: "";
	});
}
