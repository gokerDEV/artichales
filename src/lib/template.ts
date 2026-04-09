import { z } from "zod";

const SpanSchema = z.enum(["column", "full"]);
const CaptionPositionSchema = z.enum(["top", "bottom"]);
const OrientationSchema = z.enum(["portrait", "landscape"]);
const TextAlignSchema = z.enum(["left", "right", "center", "justify"]);

const HeaderFooterTokensSchema = z.object({
	left: z.string().optional(),
	center: z.string().optional(),
	right: z.string().optional(),
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

const DefaultTemplateSchema = z.object({
	typography: TypographySchema.optional(),
	colors: ColorsSchema.optional(),
	assets: z
		.object({
			maxFileSize: z.number().int().positive().optional(),
		})
		.optional(),
	components: z
		.object({
			figure: z
				.object({
					captionPosition: CaptionPositionSchema.optional(),
					defaultSpan: SpanSchema.optional(),
					spacingBefore: z.string().optional(),
					spacingAfter: z.string().optional(),
				})
				.optional(),
			table: z
				.object({
					captionPosition: CaptionPositionSchema.optional(),
					defaultSpan: SpanSchema.optional(),
					spacingBefore: z.string().optional(),
					spacingAfter: z.string().optional(),
				})
				.optional(),
		})
		.optional(),
	utilities: z.record(z.string(), z.string()).optional(),
	citationStyle: z.string().optional(),
});

const PrintTemplateSchema = z.object({
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
	headerFooter: z
		.object({
			enabled: z.boolean().optional(),
			firstPage: z
				.object({
					header: HeaderFooterTokensSchema.optional(),
					footer: HeaderFooterTokensSchema.optional(),
				})
				.optional(),
			defaultPage: z
				.object({
					header: HeaderFooterTokensSchema.optional(),
					footer: HeaderFooterTokensSchema.optional(),
				})
				.optional(),
		})
		.optional(),
	titleBlock: z
		.object({
			enabled: z.boolean().optional(),
			align: z.enum(["left", "center", "right"]).optional(),
			showAuthors: z.boolean().optional(),
			showAffiliations: z.boolean().optional(),
			showKeywords: z.boolean().optional(),
			spacingAfter: z.string().optional(),
		})
		.optional(),
});

const WebTemplateSchema = z.object({
	layout: z
		.object({
			containerWidth: z.string().optional(),
			containerClass: z.string().optional(),
			containerPaddingClass: z.string().optional(),
			contentClass: z.string().optional(),
		})
		.optional(),
});

const PluginRegistrySchema = z.object({
	id: z.string().min(1),
	enabled: z.boolean().optional(),
});

export const TemplateFileSchema = z.object({
	version: z.number().int().optional(),
	journal: z
		.object({
			id: z.string().optional(),
			name: z.string().optional(),
		})
		.optional(),
	default: DefaultTemplateSchema.optional(),
	print: PrintTemplateSchema.optional(),
	web: WebTemplateSchema.optional(),
	plugins: z.array(PluginRegistrySchema).optional(),
});

export type TemplateFile = z.infer<typeof TemplateFileSchema>;
export type TemplateDiagnostic = {
	code:
		| "template-missing"
		| "template-json-invalid"
		| "template-schema-invalid";
	severity: "error" | "warning";
	message: string;
	details?: string;
};

export type TemplateFileResolved = {
	version: number;
	journal: { id: string; name: string };
	default: {
		typography: {
			fontFamily: { body: string; heading: string; mono: string };
			fontSize: { body: string; h1: string; h2: string; h3: string };
			lineHeight: number;
			textAlign: "left" | "right" | "center" | "justify";
		};
		colors: { text: string; muted: string; border: string; link: string };
		assets: {
			maxFileSize?: number;
		};
		components: {
			figure: {
				captionPosition: "top" | "bottom";
				defaultSpan: "column" | "full";
				spacingBefore: string;
				spacingAfter: string;
			};
			table: {
				captionPosition: "top" | "bottom";
				defaultSpan: "column" | "full";
				spacingBefore: string;
				spacingAfter: string;
			};
		};
		utilities: Record<string, string>;
		citationStyle: string;
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
		headerFooter: {
			enabled: boolean;
			firstPage: {
				header: { left: string; center: string; right: string };
				footer: { left: string; center: string; right: string };
			};
			defaultPage: {
				header: { left: string; center: string; right: string };
				footer: { left: string; center: string; right: string };
			};
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
	plugins: Array<{
		id: string;
		enabled: boolean;
	}>;
};

export const DEFAULT_TEMPLATE_FILE: TemplateFileResolved = {
	version: 1,
	journal: { id: "default", name: "Default Journal" },
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
			figure: {
				captionPosition: "bottom",
				defaultSpan: "column",
				spacingBefore: "0",
				spacingAfter: "0",
			},
			table: {
				captionPosition: "bottom",
				defaultSpan: "column",
				spacingBefore: "0",
				spacingAfter: "0",
			},
		},
		utilities: {},
		citationStyle: "author-year",
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
		headerFooter: {
			enabled: true,
			firstPage: {
				header: { left: "", center: "", right: "{title}" },
				footer: { left: "", center: "{pageNumber}", right: "" },
			},
			defaultPage: {
				header: { left: "", center: "", right: "{title}" },
				footer: { left: "", center: "{pageNumber}", right: "" },
			},
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
	plugins: [
		{ id: "citation-parser", enabled: true },
		{ id: "abstract-parser", enabled: true },
		{ id: "plotty-parser", enabled: true },
		{ id: "datatable-parser", enabled: true },
		{ id: "math-parser", enabled: true },
		{ id: "citation-core", enabled: true },
		{ id: "references-core", enabled: true },
		{ id: "title-core", enabled: true },
		{ id: "abstract-render", enabled: true },
		{ id: "citation-render", enabled: true },
		{ id: "ref-render", enabled: true },
		{ id: "code-render", enabled: true },
		{ id: "plotty-render", enabled: true },
		{ id: "citation-editor", enabled: true },
	],
};

const TEMPLATE_FALLBACK_MESSAGE = "Using internal fallback template defaults.";

function mergeTemplateWithDefaults(
	overrides: TemplateFile,
): TemplateFileResolved {
	return {
		version: overrides.version ?? DEFAULT_TEMPLATE_FILE.version,
		journal: {
			id: overrides.journal?.id ?? DEFAULT_TEMPLATE_FILE.journal.id,
			name: overrides.journal?.name ?? DEFAULT_TEMPLATE_FILE.journal.name,
		},
		default: {
			typography: {
				fontFamily: {
					body:
						overrides.default?.typography?.fontFamily?.body ??
						DEFAULT_TEMPLATE_FILE.default.typography.fontFamily.body,
					heading:
						overrides.default?.typography?.fontFamily?.heading ??
						DEFAULT_TEMPLATE_FILE.default.typography.fontFamily.heading,
					mono:
						overrides.default?.typography?.fontFamily?.mono ??
						DEFAULT_TEMPLATE_FILE.default.typography.fontFamily.mono,
				},
				fontSize: {
					body:
						overrides.default?.typography?.fontSize?.body ??
						DEFAULT_TEMPLATE_FILE.default.typography.fontSize.body,
					h1:
						overrides.default?.typography?.fontSize?.h1 ??
						DEFAULT_TEMPLATE_FILE.default.typography.fontSize.h1,
					h2:
						overrides.default?.typography?.fontSize?.h2 ??
						DEFAULT_TEMPLATE_FILE.default.typography.fontSize.h2,
					h3:
						overrides.default?.typography?.fontSize?.h3 ??
						DEFAULT_TEMPLATE_FILE.default.typography.fontSize.h3,
				},
				lineHeight:
					overrides.default?.typography?.lineHeight ??
					DEFAULT_TEMPLATE_FILE.default.typography.lineHeight,
				textAlign:
					overrides.default?.typography?.textAlign ??
					DEFAULT_TEMPLATE_FILE.default.typography.textAlign,
			},
			colors: {
				text:
					overrides.default?.colors?.text ??
					DEFAULT_TEMPLATE_FILE.default.colors.text,
				muted:
					overrides.default?.colors?.muted ??
					DEFAULT_TEMPLATE_FILE.default.colors.muted,
				border:
					overrides.default?.colors?.border ??
					DEFAULT_TEMPLATE_FILE.default.colors.border,
				link:
					overrides.default?.colors?.link ??
					DEFAULT_TEMPLATE_FILE.default.colors.link,
			},
			assets: {
				maxFileSize:
					overrides.default?.assets?.maxFileSize ??
					DEFAULT_TEMPLATE_FILE.default.assets.maxFileSize,
			},
			components: {
				figure: {
					captionPosition:
						overrides.default?.components?.figure?.captionPosition ??
						DEFAULT_TEMPLATE_FILE.default.components.figure.captionPosition,
					defaultSpan:
						overrides.default?.components?.figure?.defaultSpan ??
						DEFAULT_TEMPLATE_FILE.default.components.figure.defaultSpan,
					spacingBefore:
						overrides.default?.components?.figure?.spacingBefore ??
						DEFAULT_TEMPLATE_FILE.default.components.figure.spacingBefore,
					spacingAfter:
						overrides.default?.components?.figure?.spacingAfter ??
						DEFAULT_TEMPLATE_FILE.default.components.figure.spacingAfter,
				},
				table: {
					captionPosition:
						overrides.default?.components?.table?.captionPosition ??
						DEFAULT_TEMPLATE_FILE.default.components.table.captionPosition,
					defaultSpan:
						overrides.default?.components?.table?.defaultSpan ??
						DEFAULT_TEMPLATE_FILE.default.components.table.defaultSpan,
					spacingBefore:
						overrides.default?.components?.table?.spacingBefore ??
						DEFAULT_TEMPLATE_FILE.default.components.table.spacingBefore,
					spacingAfter:
						overrides.default?.components?.table?.spacingAfter ??
						DEFAULT_TEMPLATE_FILE.default.components.table.spacingAfter,
				},
			},
			utilities: {
				...DEFAULT_TEMPLATE_FILE.default.utilities,
				...(overrides.default?.utilities ?? {}),
			},
			citationStyle:
				overrides.default?.citationStyle ??
				DEFAULT_TEMPLATE_FILE.default.citationStyle,
		},
		print: {
			page: {
				size:
					overrides.print?.page?.size ?? DEFAULT_TEMPLATE_FILE.print.page.size,
				orientation:
					overrides.print?.page?.orientation ??
					DEFAULT_TEMPLATE_FILE.print.page.orientation,
				margin: {
					top:
						overrides.print?.page?.margin?.top ??
						DEFAULT_TEMPLATE_FILE.print.page.margin.top,
					right:
						overrides.print?.page?.margin?.right ??
						DEFAULT_TEMPLATE_FILE.print.page.margin.right,
					bottom:
						overrides.print?.page?.margin?.bottom ??
						DEFAULT_TEMPLATE_FILE.print.page.margin.bottom,
					left:
						overrides.print?.page?.margin?.left ??
						DEFAULT_TEMPLATE_FILE.print.page.margin.left,
				},
			},
			layout: {
				firstPageColumns:
					overrides.print?.layout?.firstPageColumns ??
					DEFAULT_TEMPLATE_FILE.print.layout.firstPageColumns,
				defaultPageColumns:
					overrides.print?.layout?.defaultPageColumns ??
					DEFAULT_TEMPLATE_FILE.print.layout.defaultPageColumns,
				columnGap:
					overrides.print?.layout?.columnGap ??
					DEFAULT_TEMPLATE_FILE.print.layout.columnGap,
			},
			headerFooter: {
				enabled:
					overrides.print?.headerFooter?.enabled ??
					DEFAULT_TEMPLATE_FILE.print.headerFooter.enabled,
				firstPage: {
					header: {
						left:
							overrides.print?.headerFooter?.firstPage?.header?.left ??
							DEFAULT_TEMPLATE_FILE.print.headerFooter.firstPage.header.left,
						center:
							overrides.print?.headerFooter?.firstPage?.header?.center ??
							DEFAULT_TEMPLATE_FILE.print.headerFooter.firstPage.header.center,
						right:
							overrides.print?.headerFooter?.firstPage?.header?.right ??
							DEFAULT_TEMPLATE_FILE.print.headerFooter.firstPage.header.right,
					},
					footer: {
						left:
							overrides.print?.headerFooter?.firstPage?.footer?.left ??
							DEFAULT_TEMPLATE_FILE.print.headerFooter.firstPage.footer.left,
						center:
							overrides.print?.headerFooter?.firstPage?.footer?.center ??
							DEFAULT_TEMPLATE_FILE.print.headerFooter.firstPage.footer.center,
						right:
							overrides.print?.headerFooter?.firstPage?.footer?.right ??
							DEFAULT_TEMPLATE_FILE.print.headerFooter.firstPage.footer.right,
					},
				},
				defaultPage: {
					header: {
						left:
							overrides.print?.headerFooter?.defaultPage?.header?.left ??
							DEFAULT_TEMPLATE_FILE.print.headerFooter.defaultPage.header.left,
						center:
							overrides.print?.headerFooter?.defaultPage?.header?.center ??
							DEFAULT_TEMPLATE_FILE.print.headerFooter.defaultPage.header
								.center,
						right:
							overrides.print?.headerFooter?.defaultPage?.header?.right ??
							DEFAULT_TEMPLATE_FILE.print.headerFooter.defaultPage.header.right,
					},
					footer: {
						left:
							overrides.print?.headerFooter?.defaultPage?.footer?.left ??
							DEFAULT_TEMPLATE_FILE.print.headerFooter.defaultPage.footer.left,
						center:
							overrides.print?.headerFooter?.defaultPage?.footer?.center ??
							DEFAULT_TEMPLATE_FILE.print.headerFooter.defaultPage.footer
								.center,
						right:
							overrides.print?.headerFooter?.defaultPage?.footer?.right ??
							DEFAULT_TEMPLATE_FILE.print.headerFooter.defaultPage.footer.right,
					},
				},
			},
			titleBlock: {
				enabled:
					overrides.print?.titleBlock?.enabled ??
					DEFAULT_TEMPLATE_FILE.print.titleBlock.enabled,
				align:
					overrides.print?.titleBlock?.align ??
					DEFAULT_TEMPLATE_FILE.print.titleBlock.align,
				showAuthors:
					overrides.print?.titleBlock?.showAuthors ??
					DEFAULT_TEMPLATE_FILE.print.titleBlock.showAuthors,
				showAffiliations:
					overrides.print?.titleBlock?.showAffiliations ??
					DEFAULT_TEMPLATE_FILE.print.titleBlock.showAffiliations,
				showKeywords:
					overrides.print?.titleBlock?.showKeywords ??
					DEFAULT_TEMPLATE_FILE.print.titleBlock.showKeywords,
				spacingAfter:
					overrides.print?.titleBlock?.spacingAfter ??
					DEFAULT_TEMPLATE_FILE.print.titleBlock.spacingAfter,
			},
		},
		web: {
			layout: {
				containerWidth:
					overrides.web?.layout?.containerWidth ??
					DEFAULT_TEMPLATE_FILE.web.layout.containerWidth,
				containerClass:
					overrides.web?.layout?.containerClass ??
					DEFAULT_TEMPLATE_FILE.web.layout.containerClass,
				containerPaddingClass:
					overrides.web?.layout?.containerPaddingClass ??
					DEFAULT_TEMPLATE_FILE.web.layout.containerPaddingClass,
				contentClass:
					overrides.web?.layout?.contentClass ??
					DEFAULT_TEMPLATE_FILE.web.layout.contentClass,
			},
		},
		plugins:
			Array.isArray(overrides.plugins) && overrides.plugins.length > 0
				? [
						...DEFAULT_TEMPLATE_FILE.plugins,
						...overrides.plugins.map((plugin) => ({
							id: plugin.id,
							enabled: plugin.enabled !== false,
						})),
					]
				: DEFAULT_TEMPLATE_FILE.plugins,
	};
}

export function resolveTemplateFile(raw: string | undefined): {
	template: TemplateFileResolved;
	diagnostics: TemplateDiagnostic[];
	hasError: boolean;
} {
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

	const parsed = TemplateFileSchema.safeParse(parsedJson);
	if (!parsed.success) {
		return {
			template: DEFAULT_TEMPLATE_FILE,
			diagnostics: [
				{
					code: "template-schema-invalid",
					severity: "error",
					message: "`template.json` does not match the expected schema.",
					details: `${parsed.error.issues[0]?.message || "Unknown schema error"}. ${TEMPLATE_FALLBACK_MESSAGE}`,
				},
			],
			hasError: true,
		};
	}

	return {
		template: mergeTemplateWithDefaults(parsed.data),
		diagnostics: [],
		hasError: false,
	};
}
