import { z } from "zod";

export const TemplateSpanSchema = z
	.enum(["column", "page", "full"])
	.transform((value) => (value === "full" ? "page" : value));
export const TemplateCaptionPositionSchema = z.enum(["top", "bottom"]);
export const TemplateOrientationSchema = z.enum(["portrait", "landscape"]);
export const TemplateTextAlignSchema = z.enum([
	"left",
	"right",
	"center",
	"justify",
]);
export const TemplateCitationStyleSchema = z.enum([
	"numeric",
	"ieee",
	"author-year",
	"apa",
]);
export const TemplateTitleBlockAlignSchema = z.enum([
	"left",
	"center",
	"right",
]);

export const TemplatePluginConfigSchema = z.object({
	captionPosition: TemplateCaptionPositionSchema.optional(),
	defaultSpan: TemplateSpanSchema.optional(),
	spacingBefore: z.string().optional(),
	spacingAfter: z.string().optional(),
	label: z.string().optional(),
});

export const TemplateMarginSegmentSchema = z.object({
	left: z.string().optional().default(""),
	center: z.string().optional().default(""),
	right: z.string().optional().default(""),
});

export const TemplateMarginConfigSchema = z.object({
	enabled: z.boolean().optional().default(true),
	first: TemplateMarginSegmentSchema.optional().default({
		left: "",
		center: "",
		right: "",
	}),
	last: TemplateMarginSegmentSchema.optional().default({
		left: "",
		center: "",
		right: "",
	}),
	odd: TemplateMarginSegmentSchema.optional().default({
		left: "",
		center: "",
		right: "",
	}),
	even: TemplateMarginSegmentSchema.optional().default({
		left: "",
		center: "",
		right: "",
	}),
});

export const TemplateMarginSchema = z.object({
	top: z.string().optional(),
	right: z.string().optional(),
	bottom: z.string().optional(),
	left: z.string().optional(),
});

export const TemplateColorsSchema = z.object({
	text: z.string().optional(),
	muted: z.string().optional(),
	border: z.string().optional(),
	link: z.string().optional(),
});

export const TemplateTypographySchema = z.object({
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
	textAlign: TemplateTextAlignSchema.optional(),
});

export const TemplateComponentsSchema = z.object({
	abstract: TemplatePluginConfigSchema.optional(),
	table: TemplatePluginConfigSchema.optional(),
	figure: TemplatePluginConfigSchema.optional(),
	map: TemplatePluginConfigSchema.optional(),
	equation: TemplatePluginConfigSchema.optional(),
	code: TemplatePluginConfigSchema.optional(),
});

export const TemplateDefaultSectionSchema = z.object({
	typography: TemplateTypographySchema.optional(),
	colors: TemplateColorsSchema.optional(),
	assets: z
		.object({
			maxFileSize: z.number().int().positive().optional(),
		})
		.optional(),
	components: TemplateComponentsSchema.optional(),
	utilities: z.record(z.string(), z.string()).optional(),
	referenceLabels: z.record(z.string(), z.string()).optional(),
	citationStyle: TemplateCitationStyleSchema.optional(),
});

export const TemplatePrintSectionSchema = z.object({
	page: z
		.object({
			size: z.string().optional(),
			orientation: TemplateOrientationSchema.optional(),
			margin: TemplateMarginSchema.optional(),
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
			header: TemplateMarginConfigSchema.optional(),
			footer: TemplateMarginConfigSchema.optional(),
			left: TemplateMarginConfigSchema.optional(),
			right: TemplateMarginConfigSchema.optional(),
		})
		.optional(),
	titleBlock: z
		.object({
			enabled: z.boolean().optional(),
			align: TemplateTitleBlockAlignSchema.optional(),
			showAuthors: z.boolean().optional(),
			showAffiliations: z.boolean().optional(),
			showKeywords: z.boolean().optional(),
			spacingAfter: z.string().optional(),
		})
		.optional(),
});

export const TemplateWebSectionSchema = z.object({
	layout: z
		.object({
			containerWidth: z.string().optional(),
			containerClass: z.string().optional(),
			containerPaddingClass: z.string().optional(),
			contentClass: z.string().optional(),
		})
		.optional(),
});

export const TemplateFileSchema = z.object({
	version: z.number().int().optional(),
	publisher: z
		.object({
			id: z.string().optional(),
			name: z.string().optional(),
		})
		.optional()
		.default({}),
	default: TemplateDefaultSectionSchema.optional().default({}),
	print: TemplatePrintSectionSchema.optional().default({}),
	web: TemplateWebSectionSchema.optional().default({}),
	plugins: z.array(z.string().trim().min(1)).optional().default([]),
});
