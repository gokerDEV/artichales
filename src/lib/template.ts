import { z } from "zod";
import type { PluginConfig } from "@/components/artichales/plugins/plugin.contract";
import {
	getDefaultTemplateDirectivePlugins,
	listTemplateDirectivePlugins,
} from "@/components/artichales/plugins/plugin.registry";

// ---------------------------------------------------------------------------
// Primitive schemas
// ---------------------------------------------------------------------------

const SpanSchema = z
	.enum(["column", "page", "full"])
	.transform((value) => (value === "full" ? "page" : value));

const CaptionPositionSchema = z.enum(["top", "bottom"]);
const OrientationSchema = z.enum(["portrait", "landscape"]);
const TextAlignSchema = z.enum(["left", "right", "center", "justify"]);
const CitationStyleSchema = z.enum(["numeric", "ieee", "author-year", "apa"]);
const TitleBlockAlignSchema = z.enum(["left", "center", "right"]);

// ---------------------------------------------------------------------------
// Shared schemas
// ---------------------------------------------------------------------------

const PluginConfigSchema: z.ZodType<PluginConfig> = z.object({
	captionPosition: CaptionPositionSchema.optional(),
	defaultSpan: SpanSchema.optional(),
	spacingBefore: z.string().optional(),
	spacingAfter: z.string().optional(),
	label: z.string().optional(),
});

const MarginSegmentSchema = z.object({
	left: z.string().optional().default(""),
	center: z.string().optional().default(""),
	right: z.string().optional().default(""),
});

const MarginConfigSchema = z.object({
	enabled: z.boolean().optional().default(true),
	first: MarginSegmentSchema.optional().default({
		left: "",
		center: "",
		right: "",
	}),
	last: MarginSegmentSchema.optional().default({
		left: "",
		center: "",
		right: "",
	}),
	odd: MarginSegmentSchema.optional().default({
		left: "",
		center: "",
		right: "",
	}),
	even: MarginSegmentSchema.optional().default({
		left: "",
		center: "",
		right: "",
	}),
});

const MarginSchema = z.object({
	top: z.string().optional(),
	right: z.string().optional(),
	bottom: z.string().optional(),
	left: z.string().optional(),
});

const ColorsSchema = z.object({
	text: z.string().optional(),
	muted: z.string().optional(),
	border: z.string().optional(),
	link: z.string().optional(),
});

const TypographySchema = z.object({
	fontFamily: z
		.object({
			body: z.string().optional(),
			heading: z.string().optional(),
			mono: z.string().optional(),
		})
		.optional(),
	fontSize: z
		.object({
			body: z.string().optional(),
			h1: z.string().optional(),
			h2: z.string().optional(),
			h3: z.string().optional(),
		})
		.optional(),
	lineHeight: z.number().optional(),
	textAlign: TextAlignSchema.optional(),
});

const ComponentsSchema = z.object({
	abstract: PluginConfigSchema.optional(),
	table: PluginConfigSchema.optional(),
	figure: PluginConfigSchema.optional(),
	map: PluginConfigSchema.optional(),
	equation: PluginConfigSchema.optional(),
	code: PluginConfigSchema.optional(),
});

// ---------------------------------------------------------------------------
// Section schemas
// ---------------------------------------------------------------------------

const DefaultTemplateSectionSchema = z.object({
	typography: TypographySchema.optional(),
	colors: ColorsSchema.optional(),
	assets: z
		.object({
			maxFileSize: z.number().int().positive().optional(),
		})
		.optional(),
	components: ComponentsSchema.optional(),
	utilities: z.record(z.string(), z.string()).optional(),
	referenceLabels: z.record(z.string(), z.string()).optional(),
	citationStyle: CitationStyleSchema.optional(),
});

const PrintTemplateSectionSchema = z.object({
	page: z
		.object({
			size: z.string().optional(),
			orientation: OrientationSchema.optional(),
			margin: MarginSchema.optional(),
		})
		.optional(),
	layout: z
		.object({
			firstPageColumns: z.number().int().min(1).optional(),
			defaultPageColumns: z.number().int().min(1).optional(),
			columnGap: z.string().optional(),
		})
		.optional(),
	pageMargins: z
		.object({
			header: MarginConfigSchema.optional().default({
				enabled: true,
				first: { left: "", center: "", right: "" },
				last: { left: "", center: "", right: "" },
				odd: { left: "", center: "", right: "" },
				even: { left: "", center: "", right: "" },
			}),
			footer: MarginConfigSchema.optional().default({
				enabled: true,
				first: { left: "", center: "", right: "" },
				last: { left: "", center: "", right: "" },
				odd: { left: "", center: "", right: "" },
				even: { left: "", center: "", right: "" },
			}),
			left: MarginConfigSchema.optional().default({
				enabled: true,
				first: { left: "", center: "", right: "" },
				last: { left: "", center: "", right: "" },
				odd: { left: "", center: "", right: "" },
				even: { left: "", center: "", right: "" },
			}),
			right: MarginConfigSchema.optional().default({
				enabled: true,
				first: { left: "", center: "", right: "" },
				last: { left: "", center: "", right: "" },
				odd: { left: "", center: "", right: "" },
				even: { left: "", center: "", right: "" },
			}),
		})
		.optional(),
	// Legacy shape (v1 templates) kept for backward compatibility.
	headerFooter: z
		.object({
			enabled: z.boolean().optional(),
			firstPage: z
				.object({
					header: MarginSegmentSchema.optional(),
					footer: MarginSegmentSchema.optional(),
				})
				.optional(),
			defaultPage: z
				.object({
					header: MarginSegmentSchema.optional(),
					footer: MarginSegmentSchema.optional(),
				})
				.optional(),
		})
		.optional(),
	titleBlock: z
		.object({
			enabled: z.boolean().optional(),
			align: TitleBlockAlignSchema.optional(),
			showAuthors: z.boolean().optional(),
			showAffiliations: z.boolean().optional(),
			showKeywords: z.boolean().optional(),
			spacingAfter: z.string().optional(),
		})
		.optional(),
});

const WebTemplateSectionSchema = z.object({
	layout: z
		.object({
			containerWidth: z.string().optional(),
			containerClass: z.string().optional(),
			containerPaddingClass: z.string().optional(),
			contentClass: z.string().optional(),
		})
		.optional(),
});

const TemplateDirectivePluginSchema = z
	.string()
	.trim()
	.min(1)
	.refine((value) => listTemplateDirectivePlugins().includes(value), {
		message: `Directive plugin must be one of: ${listTemplateDirectivePlugins().join(", ")}`,
	});

// ---------------------------------------------------------------------------
// Root file schema  (incoming / partial — all optional fields)
// ---------------------------------------------------------------------------

export const TemplateFileSchema = z.object({
	version: z.number().int().optional(),
	publisher: z
		.object({
			id: z.string().optional(),
			name: z.string().optional(),
		})
		.optional()
		.default({}),
	default: DefaultTemplateSectionSchema.optional().default({}),
	print: PrintTemplateSectionSchema.optional().default({}),
	web: WebTemplateSectionSchema.optional().default({}),
	plugins: z
		.array(TemplateDirectivePluginSchema)
		.optional()
		.default(getDefaultTemplateDirectivePlugins())
		.transform((plugins) =>
			[...new Set(plugins.map((p) => p.trim()))].filter(Boolean),
		),
});

/** Shape of an incoming (un-merged) template file after Zod parsing. */
export type TemplateFile = z.infer<typeof TemplateFileSchema>;

// ---------------------------------------------------------------------------
// Resolved type — all fields are required after merging with defaults
// ---------------------------------------------------------------------------

export type ResolvedMarginSegment = {
	left: string;
	center: string;
	right: string;
};

export type ResolvedMarginConfig = {
	enabled: boolean;
	first: ResolvedMarginSegment;
	last: ResolvedMarginSegment;
	odd: ResolvedMarginSegment;
	even: ResolvedMarginSegment;
};

export type ResolvedComponents = {
	abstract: PluginConfig;
	table: PluginConfig;
	figure: PluginConfig;
	map: PluginConfig;
	equation: PluginConfig;
	code: PluginConfig;
};

export type TemplateFileResolved = {
	version: number;
	publisher: {
		id: string;
		name: string;
	};
	default: {
		typography: {
			fontFamily: { body: string; heading: string; mono: string };
			fontSize: { body: string; h1: string; h2: string; h3: string };
			lineHeight: number;
			textAlign: "left" | "right" | "center" | "justify";
		};
		colors: {
			text: string;
			muted: string;
			border: string;
			link: string;
		};
		assets: {
			maxFileSize?: number;
		};
		components: ResolvedComponents;
		utilities: Record<string, string>;
		referenceLabels: Record<string, string>;
		citationStyle: "numeric" | "ieee" | "author-year" | "apa";
	};
	print: {
		page: {
			size: string;
			orientation: "portrait" | "landscape";
			margin: { top: string; right: string; bottom: string; left: string };
		};
		layout: {
			firstPageColumns: number;
			defaultPageColumns: number;
			columnGap: string;
		};
		pageMargins: {
			header: ResolvedMarginConfig;
			footer: ResolvedMarginConfig;
			left: ResolvedMarginConfig;
			right: ResolvedMarginConfig;
		};
		titleBlock: {
			enabled: boolean;
			align: "left" | "center" | "right";
			showAuthors: boolean;
			showAffiliations: boolean;
			showKeywords: boolean;
			spacingAfter: string;
		};
	};
	web: {
		layout: {
			containerWidth: string;
			containerClass: string;
			containerPaddingClass: string;
			contentClass: string;
		};
	};
	plugins: string[];
};

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

export type TemplateDiagnosticCode =
	| "template-missing"
	| "template-json-invalid"
	| "template-schema-invalid";

export type TemplateDiagnostic = {
	code: TemplateDiagnosticCode;
	severity: "error" | "warning";
	message: string;
	details?: string;
};

// ---------------------------------------------------------------------------
// Default resolved template
// ---------------------------------------------------------------------------

const DEFAULT_COMPONENT_CONFIG: PluginConfig = {
	captionPosition: "bottom",
	defaultSpan: "column",
	spacingBefore: "0",
	spacingAfter: "0",
};

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

const DEFAULT_HEADER_MARGIN_CONFIG: ResolvedMarginConfig = {
	enabled: true,
	first: { left: "", center: "", right: "{title}" },
	last: { left: "", center: "", right: "{title}" },
	odd: { left: "", center: "", right: "{title}" },
	even: { left: "", center: "", right: "{title}" },
};

const DEFAULT_FOOTER_MARGIN_CONFIG: ResolvedMarginConfig = {
	enabled: true,
	first: { left: "", center: "{pageNumber}", right: "" },
	last: { left: "", center: "{pageNumber}", right: "" },
	odd: { left: "", center: "{pageNumber}", right: "" },
	even: { left: "", center: "{pageNumber}", right: "" },
};

export const DEFAULT_TEMPLATE_FILE: TemplateFileResolved = {
	version: 1,
	publisher: { id: "default", name: "Default Publisher" },
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
			header: { ...DEFAULT_HEADER_MARGIN_CONFIG },
			footer: { ...DEFAULT_FOOTER_MARGIN_CONFIG },
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

// ---------------------------------------------------------------------------
// Deep merge helpers
// ---------------------------------------------------------------------------

function resolveMarginSegment(
	segment: { left?: string; center?: string; right?: string } | undefined,
	fallback: ResolvedMarginSegment = DEFAULT_MARGIN_SEGMENT,
): ResolvedMarginSegment {
	return {
		left: segment?.left ?? fallback.left,
		center: segment?.center ?? fallback.center,
		right: segment?.right ?? fallback.right,
	};
}

function resolveMarginConfig(
	config: z.infer<typeof MarginConfigSchema> | undefined,
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
	override: PluginConfig | undefined,
	fallback: PluginConfig,
): PluginConfig {
	return { ...fallback, ...override };
}

function resolveLegacyHeaderFooterPageMargins(
	headerFooter:
		| {
				enabled?: boolean;
				firstPage?: {
					header?: { left?: string; center?: string; right?: string };
					footer?: { left?: string; center?: string; right?: string };
				};
				defaultPage?: {
					header?: { left?: string; center?: string; right?: string };
					footer?: { left?: string; center?: string; right?: string };
				};
		  }
		| undefined,
): Pick<
	TemplateFileResolved["print"]["pageMargins"],
	"header" | "footer"
> | null {
	if (!headerFooter) return null;

	const enabled = headerFooter.enabled ?? true;
	const firstHeader = resolveMarginSegment(headerFooter.firstPage?.header);
	const defaultHeader = resolveMarginSegment(headerFooter.defaultPage?.header);
	const firstFooter = resolveMarginSegment(headerFooter.firstPage?.footer);
	const defaultFooter = resolveMarginSegment(headerFooter.defaultPage?.footer);

	return {
		header: {
			enabled,
			first: firstHeader,
			last: defaultHeader,
			odd: defaultHeader,
			even: defaultHeader,
		},
		footer: {
			enabled,
			first: firstFooter,
			last: defaultFooter,
			odd: defaultFooter,
			even: defaultFooter,
		},
	};
}

// ---------------------------------------------------------------------------
// Merge parsed template with defaults
// ---------------------------------------------------------------------------

function mergeTemplateWithDefaults(parsed: TemplateFile): TemplateFileResolved {
	const def = DEFAULT_TEMPLATE_FILE;
	const o = parsed;
	const legacyPageMargins = resolveLegacyHeaderFooterPageMargins(
		o.print?.headerFooter,
	);

	return {
		version: o.version ?? def.version,
		publisher: {
			id: o.publisher?.id ?? def.publisher.id,
			name: o.publisher?.name ?? def.publisher.name,
		},
		default: {
			typography: {
				fontFamily: {
					body:
						o.default?.typography?.fontFamily?.body ??
						def.default.typography.fontFamily.body,
					heading:
						o.default?.typography?.fontFamily?.heading ??
						def.default.typography.fontFamily.heading,
					mono:
						o.default?.typography?.fontFamily?.mono ??
						def.default.typography.fontFamily.mono,
				},
				fontSize: {
					body:
						o.default?.typography?.fontSize?.body ??
						def.default.typography.fontSize.body,
					h1:
						o.default?.typography?.fontSize?.h1 ??
						def.default.typography.fontSize.h1,
					h2:
						o.default?.typography?.fontSize?.h2 ??
						def.default.typography.fontSize.h2,
					h3:
						o.default?.typography?.fontSize?.h3 ??
						def.default.typography.fontSize.h3,
				},
				lineHeight:
					o.default?.typography?.lineHeight ??
					def.default.typography.lineHeight,
				textAlign:
					o.default?.typography?.textAlign ?? def.default.typography.textAlign,
			},
			colors: {
				text: o.default?.colors?.text ?? def.default.colors.text,
				muted: o.default?.colors?.muted ?? def.default.colors.muted,
				border: o.default?.colors?.border ?? def.default.colors.border,
				link: o.default?.colors?.link ?? def.default.colors.link,
			},
			assets: {
				maxFileSize:
					o.default?.assets?.maxFileSize ?? def.default.assets.maxFileSize,
			},
			components: {
				abstract: resolveComponentConfig(
					o.default?.components?.abstract,
					def.default.components.abstract,
				),
				table: resolveComponentConfig(
					o.default?.components?.table,
					def.default.components.table,
				),
				figure: resolveComponentConfig(
					o.default?.components?.figure,
					def.default.components.figure,
				),
				map: resolveComponentConfig(
					o.default?.components?.map,
					def.default.components.map,
				),
				equation: resolveComponentConfig(
					o.default?.components?.equation,
					def.default.components.equation,
				),
				code: resolveComponentConfig(
					o.default?.components?.code,
					def.default.components.code,
				),
			},
			utilities: {
				...def.default.utilities,
				...o.default?.utilities,
			},
			referenceLabels: {
				...def.default.referenceLabels,
				...o.default?.referenceLabels,
			},
			citationStyle: o.default?.citationStyle ?? def.default.citationStyle,
		},
		print: {
			page: {
				size: o.print?.page?.size ?? def.print.page.size,
				orientation: o.print?.page?.orientation ?? def.print.page.orientation,
				margin: {
					top: o.print?.page?.margin?.top ?? def.print.page.margin.top,
					right: o.print?.page?.margin?.right ?? def.print.page.margin.right,
					bottom: o.print?.page?.margin?.bottom ?? def.print.page.margin.bottom,
					left: o.print?.page?.margin?.left ?? def.print.page.margin.left,
				},
			},
			layout: {
				firstPageColumns:
					o.print?.layout?.firstPageColumns ??
					def.print.layout.firstPageColumns,
				defaultPageColumns:
					o.print?.layout?.defaultPageColumns ??
					def.print.layout.defaultPageColumns,
				columnGap: o.print?.layout?.columnGap ?? def.print.layout.columnGap,
			},
			pageMargins: {
				header: resolveMarginConfig(
					o.print?.pageMargins?.header ?? legacyPageMargins?.header,
					def.print.pageMargins.header,
				),
				footer: resolveMarginConfig(
					o.print?.pageMargins?.footer ?? legacyPageMargins?.footer,
					def.print.pageMargins.footer,
				),
				left: resolveMarginConfig(
					o.print?.pageMargins?.left,
					def.print.pageMargins.left,
				),
				right: resolveMarginConfig(
					o.print?.pageMargins?.right,
					def.print.pageMargins.right,
				),
			},
			titleBlock: {
				enabled: o.print?.titleBlock?.enabled ?? def.print.titleBlock.enabled,
				align: o.print?.titleBlock?.align ?? def.print.titleBlock.align,
				showAuthors:
					o.print?.titleBlock?.showAuthors ?? def.print.titleBlock.showAuthors,
				showAffiliations:
					o.print?.titleBlock?.showAffiliations ??
					def.print.titleBlock.showAffiliations,
				showKeywords:
					o.print?.titleBlock?.showKeywords ??
					def.print.titleBlock.showKeywords,
				spacingAfter:
					o.print?.titleBlock?.spacingAfter ??
					def.print.titleBlock.spacingAfter,
			},
		},
		web: {
			layout: {
				containerWidth:
					o.web?.layout?.containerWidth ?? def.web.layout.containerWidth,
				containerClass:
					o.web?.layout?.containerClass ?? def.web.layout.containerClass,
				containerPaddingClass:
					o.web?.layout?.containerPaddingClass ??
					def.web.layout.containerPaddingClass,
				contentClass:
					o.web?.layout?.contentClass ?? def.web.layout.contentClass,
			},
		},
		plugins:
			Array.isArray(o.plugins) && o.plugins.length > 0
				? [...new Set(o.plugins.map((p) => p.trim()))].filter(Boolean)
				: def.plugins,
	};
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const TEMPLATE_FALLBACK_MESSAGE = "Using internal fallback template defaults.";

export type ResolveTemplateFileResult = {
	template: TemplateFileResolved;
	diagnostics: TemplateDiagnostic[];
	hasError: boolean;
};

export function resolveTemplateFile(
	raw: string | undefined,
): ResolveTemplateFileResult {
	if (!raw || raw.trim() === "") {
		return {
			template: DEFAULT_TEMPLATE_FILE,
			diagnostics: [
				{
					code: "template-missing",
					severity: "error",
					message: "`template.json` is missing or empty.",
					details: TEMPLATE_FALLBACK_MESSAGE,
				},
			],
			hasError: true,
		};
	}

	let parsedJson: unknown;
	try {
		parsedJson = JSON.parse(raw);
	} catch (error) {
		const details = error instanceof Error ? error.message : undefined;
		return {
			template: DEFAULT_TEMPLATE_FILE,
			diagnostics: [
				{
					code: "template-json-invalid",
					severity: "error",
					message: "`template.json` is not valid JSON.",
					details: details
						? `${details}. ${TEMPLATE_FALLBACK_MESSAGE}`
						: undefined,
				},
			],
			hasError: true,
		};
	}

	const result = TemplateFileSchema.safeParse(parsedJson);
	if (!result.success) {
		const issue = result.error.issues[0];
		const pathMsg = issue?.path.join(".") || "Unknown path";
		return {
			template: DEFAULT_TEMPLATE_FILE,
			diagnostics: [
				{
					code: "template-schema-invalid",
					severity: "error",
					message: "`template.json` does not match the expected schema.",
					details: `${pathMsg}: ${issue?.message ?? "Unknown schema error"}. ${TEMPLATE_FALLBACK_MESSAGE}`,
				},
			],
			hasError: true,
		};
	}

	return {
		template: mergeTemplateWithDefaults(result.data),
		diagnostics: [],
		hasError: false,
	};
}
