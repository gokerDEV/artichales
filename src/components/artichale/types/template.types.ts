import type { z } from "zod";
import type {
	TemplateCaptionPositionSchema,
	TemplateCitationStyleSchema,
	TemplateDefaultSectionSchema,
	TemplateFileSchema,
	TemplateMarginConfigSchema,
	TemplateMarginSegmentSchema,
	TemplateOrientationSchema,
	TemplatePluginConfigSchema,
	TemplatePrintSectionSchema,
	TemplateSpanSchema,
	TemplateTextAlignSchema,
	TemplateTitleBlockAlignSchema,
	TemplateWebSectionSchema,
} from "@/components/artichale/schema/template.schema";

export type TemplateSpan = z.infer<typeof TemplateSpanSchema>;
export type TemplateCaptionPosition = z.infer<
	typeof TemplateCaptionPositionSchema
>;
export type TemplateOrientation = z.infer<typeof TemplateOrientationSchema>;
export type TemplateTextAlign = z.infer<typeof TemplateTextAlignSchema>;
export type TemplateCitationStyle = z.infer<typeof TemplateCitationStyleSchema>;
export type TemplateTitleBlockAlign = z.infer<
	typeof TemplateTitleBlockAlignSchema
>;

export type TemplatePluginConfigInput = z.infer<
	typeof TemplatePluginConfigSchema
>;
export type TemplateMarginSegmentInput = z.infer<
	typeof TemplateMarginSegmentSchema
>;
export type TemplateMarginConfigInput = z.infer<
	typeof TemplateMarginConfigSchema
>;
export type TemplateDefaultSectionInput = z.infer<
	typeof TemplateDefaultSectionSchema
>;
export type TemplatePrintSectionInput = z.infer<
	typeof TemplatePrintSectionSchema
>;
export type TemplateWebSectionInput = z.infer<typeof TemplateWebSectionSchema>;
export type TemplateFileInput = z.infer<typeof TemplateFileSchema>;

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

export type ResolvedTemplatePluginConfig = {
	captionPosition?: TemplateCaptionPosition;
	defaultSpan?: TemplateSpan;
	spacingBefore?: string;
	spacingAfter?: string;
	label?: string;
};

export type ResolvedTemplateComponents = {
	abstract: ResolvedTemplatePluginConfig;
	table: ResolvedTemplatePluginConfig;
	figure: ResolvedTemplatePluginConfig;
	map: ResolvedTemplatePluginConfig;
	equation: ResolvedTemplatePluginConfig;
	code: ResolvedTemplatePluginConfig;
};

export type TemplateResolved = {
	version: number;
	publisher: {
		id: string;
		name: string;
	};
	default: {
		typography: {
			fontFamily: {
				body: string;
				heading: string;
				mono: string;
			};
			fontSize: {
				body: string;
				h1: string;
				h2: string;
				h3: string;
			};
			lineHeight: number;
			textAlign: TemplateTextAlign;
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
		components: ResolvedTemplateComponents;
		utilities: Record<string, string>;
		referenceLabels: Record<string, string>;
		citationStyle: TemplateCitationStyle;
	};
	print: {
		page: {
			size: string;
			orientation: TemplateOrientation;
			margin: {
				top: string;
				right: string;
				bottom: string;
				left: string;
			};
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
			align: TemplateTitleBlockAlign;
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

export type ResolveTemplateResult = {
	template: TemplateResolved;
	diagnostics: TemplateDiagnostic[];
	hasError: boolean;
};
