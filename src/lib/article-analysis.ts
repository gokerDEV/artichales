type DiagnosticSeverity = "error" | "warning" | "info";

export type ArticleAnalysisDiagnostic = {
	code:
		| "article-ref-short-missing-unkeyed-target"
		| "article-ref-short-ambiguous-unkeyed-target"
		| "article-ref-unresolved-keyed-target"
		| "article-directive-identity-duplicate"
		| "article-caption-identity-duplicate"
		| "plugin-required-data-file-missing";
	severity: DiagnosticSeverity;
	message: string;
	source: "parser" | "core" | "plugin";
	pluginId?: string;
};

export type ResolvedReference = {
	label: string;
	href: string;
	diagnostic?: ArticleAnalysisDiagnostic;
};

type ReferenceTarget = {
	type: string;
	key?: string;
	number: number;
	source: "directive" | "caption";
};

type ReferenceTypeConfig = {
	label: string;
	anchorPrefix: string;
};

const REFERENCE_TYPE_CONFIG: Record<string, ReferenceTypeConfig> = {
	abstract: {
		label: "Abstract",
		anchorPrefix: "abstract",
	},
	plotty: {
		label: "Figure",
		anchorPrefix: "plot",
	},
	datatable: {
		label: "Table",
		anchorPrefix: "datatable",
	},
};

const PLUGINS_REQUIRING_DATA_FILE = new Set(["plotty", "datatable"]);

function normalizeToken(value: string): string {
	return value.trim().toLowerCase();
}

function normalizeKey(value: string): string {
	const trimmed = value.trim();
	return trimmed.replace(/\.[^/.]+$/, "");
}

function parseBracketSegments(input: string): string[] {
	const segments: string[] = [];
	const segmentRegex = /\[([^\]]*)\]/g;
	let match: RegExpExecArray | null = null;
	while (true) {
		match = segmentRegex.exec(input);
		if (match === null) break;
		const segment = match[1]?.trim();
		if (segment) segments.push(segment);
	}
	return segments;
}

function parseDirectiveTargets(content: string): {
	targets: ReferenceTarget[];
	diagnostics: ArticleAnalysisDiagnostic[];
} {
	const targets: ReferenceTarget[] = [];
	const diagnostics: ArticleAnalysisDiagnostic[] = [];
	const identityBySignature = new Set<string>();
	const typeCounters = new Map<string, number>();

	const directiveHeaderRegex = /^:::\s*([a-zA-Z][\w-]*)([^\n]*)$/gm;
	let match: RegExpExecArray | null = null;
	while (true) {
		match = directiveHeaderRegex.exec(content);
		if (match === null) break;
		const pluginId = normalizeToken(match[1] || "");
		const tail = match[2] || "";
		const segments = parseBracketSegments(tail);

		let dataFile: string | undefined;
		for (const segment of segments) {
			if (segment.toLowerCase().startsWith("span=")) continue;
			dataFile = segment;
			break;
		}

		if (PLUGINS_REQUIRING_DATA_FILE.has(pluginId) && !dataFile) {
			diagnostics.push({
				code: "plugin-required-data-file-missing",
				severity: "error",
				source: "plugin",
				pluginId,
				message: `Plugin "${pluginId}" requires a data file, but directive is unkeyed.`,
			});
		}

		const normalizedDataFile =
			typeof dataFile === "string" ? normalizeToken(dataFile) : undefined;
		const identitySignature = normalizedDataFile
			? `${pluginId}::${normalizedDataFile}`
			: pluginId;
		if (identityBySignature.has(identitySignature)) {
			diagnostics.push({
				code: "article-directive-identity-duplicate",
				severity: "error",
				source: "core",
				message: normalizedDataFile
					? `Duplicate directive identity "${pluginId} + ${normalizedDataFile}" is not allowed.`
					: `Duplicate directive identity "${pluginId}" is not allowed.`,
			});
			continue;
		}
		identityBySignature.add(identitySignature);

		const currentCount = typeCounters.get(pluginId) || 0;
		const nextCount = currentCount + 1;
		typeCounters.set(pluginId, nextCount);

		targets.push({
			type: pluginId,
			key: normalizedDataFile ? normalizeKey(normalizedDataFile) : undefined,
			number: nextCount,
			source: "directive",
		});
	}

	return { targets, diagnostics };
}

function parseCaptionTargets(
	content: string,
	initialTypeCounters: Map<string, number>,
): {
	targets: ReferenceTarget[];
	diagnostics: ArticleAnalysisDiagnostic[];
} {
	const diagnostics: ArticleAnalysisDiagnostic[] = [];
	const targets: ReferenceTarget[] = [];
	const captionIdentitySet = new Set<string>();
	const counters = new Map(initialTypeCounters);

	const captionRegex =
		/\[caption\s*:\s*([a-zA-Z][\w-]*)\s*:\s*([^\]\s][^\]]*)\](?:\([^)]+\))?/gi;
	let match: RegExpExecArray | null = null;
	while (true) {
		match = captionRegex.exec(content);
		if (match === null) break;
		const type = normalizeToken(match[1] || "");
		const key = normalizeKey(normalizeToken(match[2] || ""));
		if (!type || !key) continue;

		const identity = `${type}:${key}`;
		if (captionIdentitySet.has(identity)) {
			diagnostics.push({
				code: "article-caption-identity-duplicate",
				severity: "error",
				source: "core",
				message: `Duplicate caption identity "${identity}" is not allowed.`,
			});
			continue;
		}
		captionIdentitySet.add(identity);

		const currentCount = counters.get(type) || 0;
		const nextCount = currentCount + 1;
		counters.set(type, nextCount);
		targets.push({
			type,
			key,
			number: nextCount,
			source: "caption",
		});
	}

	return { targets, diagnostics };
}

function parseRefSelectors(raw: string): string[] {
	return raw
		.split(",")
		.map((segment) => segment.trim())
		.map((segment) =>
			segment.toLowerCase().startsWith("ref:")
				? segment.slice("ref:".length).trim()
				: segment,
		)
		.map((segment) =>
			segment
				.split(":")
				.map((part) => part.trim())
				.filter(Boolean)
				.join(":"),
		)
		.filter(Boolean);
}

function getReferenceTypeConfig(type: string): ReferenceTypeConfig {
	return (
		REFERENCE_TYPE_CONFIG[type] || {
			label: "?",
			anchorPrefix: type,
		}
	);
}

function buildReferenceResolution(
	content: string,
	targets: ReferenceTarget[],
): {
	resolvedReferences: Record<string, ResolvedReference>;
	diagnostics: ArticleAnalysisDiagnostic[];
} {
	const diagnostics: ArticleAnalysisDiagnostic[] = [];
	const resolvedReferences: Record<string, ResolvedReference> = {};

	const keyedTargetMap = new Map<string, ReferenceTarget>();
	const unkeyedTargetMap = new Map<string, ReferenceTarget[]>();

	for (const target of targets) {
		const type = normalizeToken(target.type);
		if (target.key) {
			keyedTargetMap.set(`${type}:${normalizeKey(target.key)}`, target);
		} else {
			const existing = unkeyedTargetMap.get(type) || [];
			existing.push(target);
			unkeyedTargetMap.set(type, existing);
		}
	}

	const refRegex = /\[ref\s*:\s*([^\]]+)\]/gi;
	let match: RegExpExecArray | null = null;
	while (true) {
		match = refRegex.exec(content);
		if (match === null) break;
		const rawRefBody = match[1] || "";
		const selectors = parseRefSelectors(rawRefBody);
		for (const selector of selectors) {
			if (resolvedReferences[selector]) continue;
			const parts = selector.split(":").map((part) => part.trim());
			if (parts.length === 0 || !parts[0]) continue;
			const type = normalizeToken(parts[0]);
			const config = getReferenceTypeConfig(type);

			if (parts.length === 1) {
				const candidates = unkeyedTargetMap.get(type) || [];
				if (candidates.length === 1) {
					resolvedReferences[selector] = {
						label: config.label,
						href: "#",
					};
					continue;
				}
				if (candidates.length === 0) {
					const diagnostic: ArticleAnalysisDiagnostic = {
						code: "article-ref-short-missing-unkeyed-target",
						severity: "error",
						source: "core",
						message: `Short reference "[ref:${type}]" requires exactly one unkeyed "${type}" target, but none were found.`,
					};
					diagnostics.push(diagnostic);
					resolvedReferences[selector] = { label: "?", href: "#" };
					continue;
				}
				const diagnostic: ArticleAnalysisDiagnostic = {
					code: "article-ref-short-ambiguous-unkeyed-target",
					severity: "error",
					source: "core",
					message: `Short reference "[ref:${type}]" is ambiguous because multiple unkeyed "${type}" targets exist.`,
				};
				diagnostics.push(diagnostic);
				resolvedReferences[selector] = { label: "?", href: "#" };
				continue;
			}

			const key = normalizeKey(parts.slice(1).join(":"));
			const resolved = keyedTargetMap.get(`${type}:${key}`);
			if (!resolved) {
				const diagnostic: ArticleAnalysisDiagnostic = {
					code: "article-ref-unresolved-keyed-target",
					severity: "warning",
					source: "core",
					message: `Reference target "[ref:${type}:${key}]" could not be resolved.`,
				};
				diagnostics.push(diagnostic);
				resolvedReferences[selector] = { label: "?", href: "#" };
				continue;
			}

			resolvedReferences[selector] = {
				label: `${config.label} ${resolved.number}`.trim(),
				href:
					resolved.source === "caption"
						? `#caption-${type}-${key}`
						: `#${config.anchorPrefix}-${key}`,
			};
		}
	}

	return { resolvedReferences, diagnostics };
}

export function analyzeArticleSource(content: string): {
	diagnostics: ArticleAnalysisDiagnostic[];
	resolvedReferences: Record<string, ResolvedReference>;
} {
	const directiveResult = parseDirectiveTargets(content);
	const counters = new Map<string, number>();
	for (const target of directiveResult.targets) {
		counters.set(
			target.type,
			Math.max(counters.get(target.type) || 0, target.number),
		);
	}
	const captionResult = parseCaptionTargets(content, counters);

	const allTargets = [...directiveResult.targets, ...captionResult.targets];
	const resolutionResult = buildReferenceResolution(content, allTargets);

	return {
		diagnostics: [
			...directiveResult.diagnostics,
			...captionResult.diagnostics,
			...resolutionResult.diagnostics,
		],
		resolvedReferences: resolutionResult.resolvedReferences,
	};
}
