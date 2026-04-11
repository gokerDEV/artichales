type DiagnosticSeverity = "error" | "warning" | "info";

export type ArticleAnalysisDiagnostic = {
	code:
		| "article-ref-short-missing-unkeyed-target"
		| "article-ref-short-ambiguous-unkeyed-target"
		| "article-ref-unresolved-keyed-target"
		| "article-ref-label-unmapped"
		| "article-directive-identity-duplicate"
		| "article-caption-identity-duplicate"
		| "article-directive-invalid-data-file-segments"
		| "article-directive-data-file-unsupported"
		| "plugin-required-data-file-missing";
	severity: DiagnosticSeverity;
	message: string;
	source: "parser" | "core" | "plugin";
	pluginId?: string;
	offset?: number;
	line?: number;
	column?: number;
};

export type ResolvedReference = {
	label: string;
	href: string;
	diagnostic?: ArticleAnalysisDiagnostic;
};

export type ResolvedCaption = {
	type: string;
	key: string;
	number: string;
	href: string;
	label: string;
};

export type ReferenceSelectorTarget = {
	selector: string;
	mode: "full" | "partial";
};

type ReferenceTarget = {
	type: string;
	key?: string;
	number: string;
	source: "directive" | "caption";
};

type ReferenceTypeConfig = {
	label: string;
	anchorPrefix: string;
	isMapped: boolean;
};

const REFERENCE_TYPE_CONFIG: Record<string, { anchorPrefix: string }> = {
	abstract: {
		anchorPrefix: "abstract",
	},
	plotty: {
		anchorPrefix: "plot",
	},
	datatable: {
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

function offsetToLocation(
	content: string,
	offset: number,
): {
	offset: number;
	line: number;
	column: number;
} {
	const safeOffset = Math.max(0, Math.min(offset, content.length));
	let line = 1;
	let column = 1;
	for (let index = 0; index < safeOffset; index++) {
		if (content[index] === "\n") {
			line++;
			column = 1;
			continue;
		}
		column++;
	}
	return { offset: safeOffset, line, column };
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

	const directiveHeaderRegex = /^:::[ \t]*([a-zA-Z][\w-]*)([^\n]*)$/gm;
	let match: RegExpExecArray | null = null;
	while (true) {
		match = directiveHeaderRegex.exec(content);
		if (match === null) break;
		const pluginId = normalizeToken(match[1] || "");
		const tail = match[2] || "";
		const segments = parseBracketSegments(tail);
		const dataSegments = segments.filter(
			(segment) => !segment.toLowerCase().startsWith("span="),
		);
		if (dataSegments.length > 1) {
			diagnostics.push({
				code: "article-directive-invalid-data-file-segments",
				severity: "error",
				source: "parser",
				message: `Directive "${pluginId}" can declare at most one data file segment.`,
				...offsetToLocation(content, match.index),
			});
		}

		const dataFile = dataSegments[0];

		if (dataFile && !PLUGINS_REQUIRING_DATA_FILE.has(pluginId)) {
			diagnostics.push({
				code: "article-directive-data-file-unsupported",
				severity: "error",
				source: "core",
				message: `Directive "${pluginId}" does not accept a data file segment.`,
				...offsetToLocation(content, match.index),
			});
		}

		if (PLUGINS_REQUIRING_DATA_FILE.has(pluginId) && !dataFile) {
			diagnostics.push({
				code: "plugin-required-data-file-missing",
				severity: "error",
				source: "plugin",
				pluginId,
				message: `Plugin "${pluginId}" requires a data file, but directive is unkeyed.`,
				...offsetToLocation(content, match.index),
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
				...offsetToLocation(content, match.index),
			});
		} else {
			identityBySignature.add(identitySignature);
		}

		const currentCount = typeCounters.get(pluginId) || 0;
		const nextCount = currentCount + 1;
		typeCounters.set(pluginId, nextCount);

		targets.push({
			type: pluginId,
			key: normalizedDataFile ? normalizeKey(normalizedDataFile) : undefined,
			number: String(nextCount),
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
	const counters = new Map(initialTypeCounters); // Dedicated counters for captions

	const headingCounters = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

	const captionRegex =
		/\[caption\s*:\s*([#a-zA-Z][\w#-]*)\s*:\s*([^\]\s][^\]]*)\](?:\([^)]+\))?/gi;
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
				...offsetToLocation(content, match.index),
			});
			continue;
		}
		captionIdentitySet.add(identity);

		let displayedNumber = "";
		if (type.startsWith("#")) {
			const level = Math.min(6, Math.max(1, type.split("#").length - 1));
			headingCounters[level as keyof typeof headingCounters]++;
			for (let i = level + 1; i <= 6; i++) {
				headingCounters[i as keyof typeof headingCounters] = 0;
			}

			const parts: number[] = [];
			for (let i = 1; i <= level; i++) {
				parts.push(headingCounters[i as keyof typeof headingCounters]);
			}
			displayedNumber = parts.join(".");
		} else {
			const currentCount = counters.get(type) || 0;
			const nextCount = currentCount + 1;
			counters.set(type, nextCount);
			displayedNumber = String(nextCount);
		}

		targets.push({
			type,
			key,
			number: displayedNumber,
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

function getReferenceTypeConfig(
	type: string,
	referenceLabels: Record<string, string>,
): ReferenceTypeConfig {
	const preset = REFERENCE_TYPE_CONFIG[type];
	const templateLabel = referenceLabels[type];
	const mappedLabel =
		typeof templateLabel === "string" && templateLabel.trim() !== ""
			? templateLabel.trim()
			: "";

	return {
		label: mappedLabel || "?",
		anchorPrefix: preset?.anchorPrefix || type,
		isMapped: mappedLabel !== "",
	};
}

function buildReferenceResolution(
	content: string,
	targets: ReferenceTarget[],
	referenceLabels: Record<string, string>,
): {
	resolvedReferences: Record<string, ResolvedReference>;
	captions: Record<string, ResolvedCaption>;
	diagnostics: ArticleAnalysisDiagnostic[];
} {
	const diagnostics: ArticleAnalysisDiagnostic[] = [];
	const resolvedReferences: Record<string, ResolvedReference> = {};
	const captions: Record<string, ResolvedCaption> = {};

	const keyedTargetMap = new Map<string, ReferenceTarget>();
	const unkeyedTargetMap = new Map<string, ReferenceTarget[]>();

	for (const target of targets) {
		const type = normalizeToken(target.type);
		if (target.key) {
			const normalizedKey = normalizeKey(target.key);
			keyedTargetMap.set(`${type}:${normalizedKey}`, target);

			// Eagerly insert into resolvedReferences so cross-references work
			const config = getReferenceTypeConfig(type, referenceLabels);
			const labelStr = type.startsWith("#")
				? target.number
				: `${config.label} ${target.number}`.trim();
			const hrefStr =
				target.source === "caption"
					? `#caption-${type}-${normalizedKey}`
					: `#${config.anchorPrefix}-${normalizedKey}`;
			resolvedReferences[`${type}:${normalizedKey}`] = {
				label: labelStr,
				href: hrefStr,
			};

			if (target.source === "caption") {
				captions[`${type}:${normalizedKey}`] = {
					type,
					key: normalizedKey,
					number: target.number,
					href: hrefStr,
					label: labelStr,
				};
			}
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
			const config = getReferenceTypeConfig(type, referenceLabels);

			if (parts.length === 1) {
				const candidates = unkeyedTargetMap.get(type) || [];
				if (candidates.length === 1) {
					if (!config.isMapped) {
						diagnostics.push({
							code: "article-ref-label-unmapped",
							severity: "warning",
							source: "core",
							message: `Reference type "${type}" is not mapped in template labels. Falling back to "?".`,
							...offsetToLocation(content, match.index),
						});
					}
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
						...offsetToLocation(content, match.index),
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
					...offsetToLocation(content, match.index),
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
					...offsetToLocation(content, match.index),
				};
				diagnostics.push(diagnostic);
				resolvedReferences[selector] = { label: "?", href: "#" };
				continue;
			}

			if (!config.isMapped) {
				diagnostics.push({
					code: "article-ref-label-unmapped",
					severity: "warning",
					source: "core",
					message: `Reference type "${type}" is not mapped in template labels. Falling back to "? ${resolved.number}".`,
					...offsetToLocation(content, match.index),
				});
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

	return { resolvedReferences, captions, diagnostics };
}

export function analyzeArticleSource(
	content: string,
	referenceLabels: Record<string, string> = {},
): {
	diagnostics: ArticleAnalysisDiagnostic[];
	resolvedReferences: Record<string, ResolvedReference>;
	captions: Record<string, ResolvedCaption>;
	referenceTargets: ReferenceSelectorTarget[];
} {
	const directiveResult = parseDirectiveTargets(content);
	const counters = new Map<string, number>();
	for (const target of directiveResult.targets) {
		counters.set(
			target.type,
			Math.max(
				counters.get(target.type) || 0,
				parseInt(target.number, 10) || 0,
			),
		);
	}
	const captionResult = parseCaptionTargets(content, counters);

	const allTargets = [...directiveResult.targets, ...captionResult.targets];
	const resolutionResult = buildReferenceResolution(
		content,
		allTargets,
		referenceLabels,
	);
	const referenceTargets: ReferenceSelectorTarget[] = [];
	const referenceTargetSet = new Set<string>();
	const unkeyedCounts = new Map<string, number>();
	for (const target of allTargets) {
		const type = normalizeToken(target.type);
		if (!target.key) {
			unkeyedCounts.set(type, (unkeyedCounts.get(type) ?? 0) + 1);
			continue;
		}
		const selector = `${type}:${normalizeKey(target.key)}`;
		if (referenceTargetSet.has(selector)) continue;
		referenceTargetSet.add(selector);
		referenceTargets.push({ selector, mode: "full" });
	}
	for (const [type, count] of unkeyedCounts) {
		if (count !== 1) continue;
		if (referenceTargetSet.has(type)) continue;
		referenceTargetSet.add(type);
		referenceTargets.push({ selector: type, mode: "partial" });
	}
	referenceTargets.sort((a, b) => a.selector.localeCompare(b.selector));

	return {
		diagnostics: [
			...directiveResult.diagnostics,
			...captionResult.diagnostics,
			...resolutionResult.diagnostics,
		],
		resolvedReferences: resolutionResult.resolvedReferences,
		captions: resolutionResult.captions,
		referenceTargets,
	};
}
