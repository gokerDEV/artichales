/**
 * Type-safe helpers for reading deeply-nested values from an article frontmatter
 * object whose top-level type is `Record<string, unknown>`.
 *
 * Rules:
 *  - Never cast to `any`.
 *  - Return `undefined` (not an empty string) when the value is absent so that
 *    callers can apply their own fallbacks explicitly.
 */

/** Reads a single key from a `Record<string, unknown>` node safely. */
function readKey(
	node: Record<string, unknown> | undefined,
	key: string,
): unknown {
	if (node == null || typeof node !== "object") return undefined;
	return (node as Record<string, unknown>)[key];
}

/** Narrows an `unknown` value to `Record<string, unknown>` or returns `undefined`. */
function asObject(value: unknown): Record<string, unknown> | undefined {
	if (typeof value === "object" && value !== null && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	return undefined;
}

/**
 * Resolves a dot-separated path in `frontmatter` and returns the final value.
 * Returns `undefined` if any segment along the path is absent or not an object.
 */
export function getFrontmatterValue(
	frontmatter: Record<string, unknown>,
	path: string,
): unknown {
	const segments = path.split(".");
	let current: unknown = frontmatter;

	for (const segment of segments) {
		const obj = asObject(current);
		if (obj === undefined) return undefined;
		current = readKey(obj, segment);
	}

	return current;
}

/**
 * Returns the value at `path` as a string, or `undefined` if absent or not a
 * string/number primitive.
 */
export function getFrontmatterString(
	frontmatter: Record<string, unknown>,
	path: string,
): string | undefined {
	const value = getFrontmatterValue(frontmatter, path);
	if (typeof value === "string") return value;
	if (typeof value === "number") return String(value);
	return undefined;
}

/**
 * Returns the value at `path` as a truthy string, or the `fallback` if the
 * value is absent, not a string/number, or empty.
 */
export function getFrontmatterStringOr(
	frontmatter: Record<string, unknown>,
	path: string,
	fallback: string,
): string {
	return getFrontmatterString(frontmatter, path) || fallback;
}
