import {
	getDefaultTemplateDirectivePlugins,
	listTemplateDirectivePlugins,
} from "@/components/artichale/core/plugin.registry";
import { TemplateFileSchema } from "@/components/artichale/schema/template.schema";
import type {
	ResolvedMarginConfig,
	ResolvedMarginSegment,
	ResolvedTemplatePluginConfig,
	ResolveTemplateResult,
	TemplateFileInput,
	TemplateResolved,
} from "@/components/artichale/types/template.types";

const DEFAULT_MARGIN_SEGMENT: ResolvedMarginSegment = {
	left: "",
	center: "",
	right: "",
};

const DEFAULT_MARGIN_CONFIG: ResolvedMarginConfig = {
	enabled: true,
	first: DEFAULT_MARGIN_SEGMENT,
	last: DEFAULT_MARGIN_SEGMENT,
	odd: DEFAULT_MARGIN_SEGMENT,
	even: DEFAULT_MARGIN_SEGMENT,
};

const DEFAULT_COMPONENT_CONFIG: ResolvedTemplatePluginConfig = {
	captionPosition: "bottom",
	defaultSpan: "column",
	spacingBefore: "0",
	spacingAfter: "0",
};

export const DEFAULT_TEMPLATE: TemplateResolved = {
	version: 1,
	publisher: {
		id: "default",
		name: "Default Publisher",
	},
	default: {
		typography: {
			fontFamily: {
				body: "Source Serif 4",
				heading: "Inter",
				mono: "JetBrains Mono",
			},
			fontSize: {
				body: "11pt",
				h1: "20pt",
				h2: "15pt",
				h3: "12pt",
			},
			lineHeight: 1.55,
			textAlign: "justify",
		},
		colors: {
			text: "#111111",
			muted: "#666666",
			border: "#d1d5db",
			link: "#0f766e",
		},
		assets: {},
		components: {
			abstract: { ...DEFAULT_COMPONENT_CONFIG },
			table: { ...DEFAULT_COMPONENT_CONFIG },
			figure: { ...DEFAULT_COMPONENT_CONFIG },
			map: { ...DEFAULT_COMPONENT_CONFIG },
			equation: { ...DEFAULT_COMPONENT_CONFIG },
			code: { ...DEFAULT_COMPONENT_CONFIG },
		},
		utilities: {},
		referenceLabels: {
			abstract: "Abstract",
			figure: "Figure",
			table: "Table",
			map: "Map",
			equation: "Equation",
			code: "Code",
		},
		citationStyle: "numeric",
	},
	print: {
		page: {
			size: "A4",
			orientation: "portrait",
			margin: {
				top: "24mm",
				right: "20mm",
				bottom: "24mm",
				left: "20mm",
			},
		},
		layout: {
			firstPageColumns: 1,
			defaultPageColumns: 2,
			columnGap: "7mm",
		},
		pageMargins: {
			header: { ...DEFAULT_MARGIN_CONFIG },
			footer: { ...DEFAULT_MARGIN_CONFIG },
			left: { ...DEFAULT_MARGIN_CONFIG },
			right: { ...DEFAULT_MARGIN_CONFIG },
		},
		titleBlock: {
			enabled: true,
			align: "center",
			showAuthors: true,
			showAffiliations: true,
			showKeywords: true,
			spacingAfter: "12mm",
		},
	},
	web: {
		layout: {
			containerWidth: "800px",
			containerClass:
				"shrink-0 rounded-xl border border-border bg-card shadow-sm",
			containerPaddingClass: "p-12 md:p-16",
			contentClass: "max-w-none",
		},
	},
	plugins: getDefaultTemplateDirectivePlugins(),
};

function resolveMarginSegment(
	segment: Partial<ResolvedMarginSegment> | undefined,
	fallback: ResolvedMarginSegment = DEFAULT_MARGIN_SEGMENT,
): ResolvedMarginSegment {
	return {
		left: segment?.left ?? fallback.left,
		center: segment?.center ?? fallback.center,
		right: segment?.right ?? fallback.right,
	};
}

function resolveMarginConfig(
	config:
		| {
				enabled?: boolean;
				first?: Partial<ResolvedMarginSegment>;
				last?: Partial<ResolvedMarginSegment>;
				odd?: Partial<ResolvedMarginSegment>;
				even?: Partial<ResolvedMarginSegment>;
		  }
		| undefined,
	fallback: ResolvedMarginConfig = DEFAULT_MARGIN_CONFIG,
): ResolvedMarginConfig {
	return {
		enabled: config?.enabled ?? fallback.enabled,
		first: resolveMarginSegment(config?.first, fallback.first),
		last: resolveMarginSegment(config?.last, fallback.last),
		odd: resolveMarginSegment(config?.odd, fallback.odd),
		even: resolveMarginSegment(config?.even, fallback.even),
	};
}

function resolveComponentConfig(
	override: ResolvedTemplatePluginConfig | undefined,
	fallback: ResolvedTemplatePluginConfig,
): ResolvedTemplatePluginConfig {
	return { ...fallback, ...override };
}

function filterKnownPlugins(plugins: string[]): string[] {
	const allowed = new Set(listTemplateDirectivePlugins());
	const unique = [
		...new Set(plugins.map((pluginId) => pluginId.trim()).filter(Boolean)),
	];
	const filtered = unique.filter((pluginId) => allowed.has(pluginId));
	return filtered.length > 0 ? filtered : getDefaultTemplateDirectivePlugins();
}

function mergeTemplateWithDefaults(
	parsed: TemplateFileInput,
): TemplateResolved {
	const defaults = DEFAULT_TEMPLATE;

	return {
		version: parsed.version ?? defaults.version,
		publisher: {
			id: parsed.publisher?.id ?? defaults.publisher.id,
			name: parsed.publisher?.name ?? defaults.publisher.name,
		},
		default: {
			typography: {
				fontFamily: {
					body:
						parsed.default?.typography?.fontFamily?.body ??
						defaults.default.typography.fontFamily.body,
					heading:
						parsed.default?.typography?.fontFamily?.heading ??
						defaults.default.typography.fontFamily.heading,
					mono:
						parsed.default?.typography?.fontFamily?.mono ??
						defaults.default.typography.fontFamily.mono,
				},
				fontSize: {
					body:
						parsed.default?.typography?.fontSize?.body ??
						defaults.default.typography.fontSize.body,
					h1:
						parsed.default?.typography?.fontSize?.h1 ??
						defaults.default.typography.fontSize.h1,
					h2:
						parsed.default?.typography?.fontSize?.h2 ??
						defaults.default.typography.fontSize.h2,
					h3:
						parsed.default?.typography?.fontSize?.h3 ??
						defaults.default.typography.fontSize.h3,
				},
				lineHeight:
					parsed.default?.typography?.lineHeight ??
					defaults.default.typography.lineHeight,
				textAlign:
					parsed.default?.typography?.textAlign ??
					defaults.default.typography.textAlign,
			},
			colors: {
				text: parsed.default?.colors?.text ?? defaults.default.colors.text,
				muted: parsed.default?.colors?.muted ?? defaults.default.colors.muted,
				border:
					parsed.default?.colors?.border ?? defaults.default.colors.border,
				link: parsed.default?.colors?.link ?? defaults.default.colors.link,
			},
			assets: {
				maxFileSize:
					parsed.default?.assets?.maxFileSize ??
					defaults.default.assets.maxFileSize,
			},
			components: {
				abstract: resolveComponentConfig(
					parsed.default?.components?.abstract,
					defaults.default.components.abstract,
				),
				table: resolveComponentConfig(
					parsed.default?.components?.table,
					defaults.default.components.table,
				),
				figure: resolveComponentConfig(
					parsed.default?.components?.figure,
					defaults.default.components.figure,
				),
				map: resolveComponentConfig(
					parsed.default?.components?.map,
					defaults.default.components.map,
				),
				equation: resolveComponentConfig(
					parsed.default?.components?.equation,
					defaults.default.components.equation,
				),
				code: resolveComponentConfig(
					parsed.default?.components?.code,
					defaults.default.components.code,
				),
			},
			utilities: {
				...defaults.default.utilities,
				...parsed.default?.utilities,
			},
			referenceLabels: {
				...defaults.default.referenceLabels,
				...parsed.default?.referenceLabels,
			},
			citationStyle:
				parsed.default?.citationStyle ?? defaults.default.citationStyle,
		},
		print: {
			page: {
				size: parsed.print?.page?.size ?? defaults.print.page.size,
				orientation:
					parsed.print?.page?.orientation ?? defaults.print.page.orientation,
				margin: {
					top:
						parsed.print?.page?.margin?.top ?? defaults.print.page.margin.top,
					right:
						parsed.print?.page?.margin?.right ??
						defaults.print.page.margin.right,
					bottom:
						parsed.print?.page?.margin?.bottom ??
						defaults.print.page.margin.bottom,
					left:
						parsed.print?.page?.margin?.left ?? defaults.print.page.margin.left,
				},
			},
			layout: {
				firstPageColumns:
					parsed.print?.layout?.firstPageColumns ??
					defaults.print.layout.firstPageColumns,
				defaultPageColumns:
					parsed.print?.layout?.defaultPageColumns ??
					defaults.print.layout.defaultPageColumns,
				columnGap:
					parsed.print?.layout?.columnGap ?? defaults.print.layout.columnGap,
			},
			pageMargins: {
				header: resolveMarginConfig(
					parsed.print?.pageMargins?.header,
					defaults.print.pageMargins.header,
				),
				footer: resolveMarginConfig(
					parsed.print?.pageMargins?.footer,
					defaults.print.pageMargins.footer,
				),
				left: resolveMarginConfig(
					parsed.print?.pageMargins?.left,
					defaults.print.pageMargins.left,
				),
				right: resolveMarginConfig(
					parsed.print?.pageMargins?.right,
					defaults.print.pageMargins.right,
				),
			},
			titleBlock: {
				enabled:
					parsed.print?.titleBlock?.enabled ??
					defaults.print.titleBlock.enabled,
				align:
					parsed.print?.titleBlock?.align ?? defaults.print.titleBlock.align,
				showAuthors:
					parsed.print?.titleBlock?.showAuthors ??
					defaults.print.titleBlock.showAuthors,
				showAffiliations:
					parsed.print?.titleBlock?.showAffiliations ??
					defaults.print.titleBlock.showAffiliations,
				showKeywords:
					parsed.print?.titleBlock?.showKeywords ??
					defaults.print.titleBlock.showKeywords,
				spacingAfter:
					parsed.print?.titleBlock?.spacingAfter ??
					defaults.print.titleBlock.spacingAfter,
			},
		},
		web: {
			layout: {
				containerWidth:
					parsed.web?.layout?.containerWidth ??
					defaults.web.layout.containerWidth,
				containerClass:
					parsed.web?.layout?.containerClass ??
					defaults.web.layout.containerClass,
				containerPaddingClass:
					parsed.web?.layout?.containerPaddingClass ??
					defaults.web.layout.containerPaddingClass,
				contentClass:
					parsed.web?.layout?.contentClass ?? defaults.web.layout.contentClass,
			},
		},
		plugins: filterKnownPlugins(parsed.plugins ?? defaults.plugins),
	};
}

const FALLBACK_MESSAGE = "Using internal fallback template defaults.";

export function parseTemplate(rawTemplate?: string): ResolveTemplateResult {
	if (!rawTemplate || rawTemplate.trim() === "") {
		return {
			template: DEFAULT_TEMPLATE,
			diagnostics: [
				{
					code: "template-missing",
					severity: "error",
					message: "`template.json` is missing or empty.",
					details: FALLBACK_MESSAGE,
				},
			],
			hasError: true,
		};
	}

	let parsedJson: unknown;
	try {
		parsedJson = JSON.parse(rawTemplate);
	} catch (error) {
		const details = error instanceof Error ? error.message : undefined;
		return {
			template: DEFAULT_TEMPLATE,
			diagnostics: [
				{
					code: "template-json-invalid",
					severity: "error",
					message: "`template.json` is not valid JSON.",
					details: details
						? `${details}. ${FALLBACK_MESSAGE}`
						: FALLBACK_MESSAGE,
				},
			],
			hasError: true,
		};
	}

	const parsedTemplate = TemplateFileSchema.safeParse(parsedJson);
	if (!parsedTemplate.success) {
		const firstIssue = parsedTemplate.error.issues[0];
		const issuePath = firstIssue?.path.join(".") || "Unknown path";
		return {
			template: DEFAULT_TEMPLATE,
			diagnostics: [
				{
					code: "template-schema-invalid",
					severity: "error",
					message: "`template.json` does not match the expected schema.",
					details: `${issuePath}: ${firstIssue?.message ?? "Unknown schema error"}. ${FALLBACK_MESSAGE}`,
				},
			],
			hasError: true,
		};
	}

	return {
		template: mergeTemplateWithDefaults(parsedTemplate.data),
		diagnostics: [],
		hasError: false,
	};
}
