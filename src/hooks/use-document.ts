import type { JSX } from "react";
import * as React from "react";
import { parse as parseYaml } from "yaml";
import type { PreviewTarget } from "@/components/artichales/panels/preview-header";
import type { BibtexDiagnostic, CitationEntry } from "@/lib/bibtex";
import { parseBibtexDocument } from "@/lib/bibtex";
import { resolveTemplateFile, type TemplateDiagnostic } from "@/lib/template";
import {
	CORE_ARTICLE_FILE,
	CORE_BIB_FILE,
	CORE_TEMPLATE_FILE,
} from "@/lib/workspace";

type RenderTarget = "web" | "print";

type DocumentStyle = {
	columns?: number;
	fontFamily?: {
		body?: string;
		heading?: string;
		mono?: string;
	};
	fontSize?: {
		body?: string;
		h1?: string;
		h2?: string;
		h3?: string;
	};
	lineHeight?: number;
	textAlign?: "left" | "right" | "center" | "justify";
};

export type DocumentTemplate = {
	version: number;
	journal: {
		id: string;
		name: string;
	};
	target: RenderTarget;
	container?: keyof JSX.IntrinsicElements;
	page?: {
		size?: "A4" | string;
		orientation?: "portrait" | "landscape";
		margin?: {
			top?: string;
			right?: string;
			bottom?: string;
			left?: string;
		};
	};
	document?: DocumentStyle;
	titleBlock?: {
		enabled?: boolean;
		showAuthors?: boolean;
		showAffiliations?: boolean;
		showKeywords?: boolean;
		align?: "left" | "right" | "center";
		spacingAfter?: string;
	};
	headerFooter?: {
		enabled?: boolean;
		firstPage?: {
			header?: { left?: string; center?: string; right?: string };
			footer?: { left?: string; center?: string; right?: string };
		};
		defaultPage?: {
			header?: { left?: string; center?: string; right?: string };
			footer?: { left?: string; center?: string; right?: string };
		};
	};
	layout?: {
		firstPageColumns?: number;
		defaultPageColumns?: number;
		columnGap?: string;
	};
	componentDefaults?: {
		figure?: {
			captionPosition?: "top" | "bottom";
			defaultSpan?: "column" | "full";
			spacingBefore?: string;
			spacingAfter?: string;
		};
		table?: {
			captionPosition?: "top" | "bottom";
			defaultSpan?: "column" | "full";
			spacingBefore?: string;
			spacingAfter?: string;
		};
	};
	webLayout?: {
		containerWidth?: string;
		containerClass?: string;
		containerPaddingClass?: string;
		contentClass?: string;
	};
	utilities?: Record<string, string>;
	colors?: {
		text?: string;
		muted?: string;
		border?: string;
		link?: string;
	};
	citationStyle?: string;
	plugins?: Array<{
		id: string;
		enabled: boolean;
	}>;
};

export interface DocumentSource {
	content: string;
	frontmatter: Record<string, unknown>;
	citations: Record<string, CitationEntry>;
	plots: Record<string, unknown>;
	template: DocumentTemplate;
	citationStyle: string;
	templateDiagnostics: TemplateDiagnostic[];
	bibDiagnostics: BibtexDiagnostic[];
	articleDiagnostics: Array<{
		code: "article-frontmatter-invalid";
		severity: "error";
		message: string;
	}>;
	blockingByFile: Partial<Record<string, string>>;
	isBlockingActiveFile: (fileName: string) => boolean;
	hasTemplateError: boolean;
	hasBlockingError: boolean;
}

function resolveTemplateForTarget(
	templateFile: ReturnType<typeof resolveTemplateFile>["template"],
	target: PreviewTarget,
): DocumentTemplate {
	const defaults = templateFile.default;
	const print = templateFile.print;
	const web = templateFile.web;

	const baseTemplate: Omit<DocumentTemplate, "target"> = {
		version: templateFile.version,
		journal: templateFile.journal,
		container: "article",
		document: {
			columns: print.layout.defaultPageColumns,
			fontFamily: defaults.typography.fontFamily,
			fontSize: defaults.typography.fontSize,
			lineHeight: defaults.typography.lineHeight,
			textAlign: defaults.typography.textAlign,
		},
		page: {
			size: print.page.size,
			orientation: print.page.orientation,
			margin: print.page.margin,
		},
		titleBlock: print.titleBlock,
		headerFooter: print.headerFooter,
		layout: {
			firstPageColumns: print.layout.firstPageColumns,
			defaultPageColumns: print.layout.defaultPageColumns,
			columnGap: print.layout.columnGap,
		},
		componentDefaults: defaults.components,
		webLayout: web.layout,
		utilities: defaults.utilities,
		colors: defaults.colors,
		citationStyle: defaults.citationStyle,
		plugins: templateFile.plugins,
	};

	return {
		...baseTemplate,
		target,
	};
}

export function useDocument(
	files: Record<string, string>,
	target: PreviewTarget,
): DocumentSource {
	const articleText = files[CORE_ARTICLE_FILE] || "";
	const parsed = React.useMemo(() => {
		const text = articleText;
		const match = text.match(/^---\n([\s\S]*?)\n---/);
		if (!match)
			return {
				content: text,
				data: {},
				diagnostics: [] as DocumentSource["articleDiagnostics"],
			};

		try {
			const data = parseYaml(match[1]);
			const content = text.slice(match[0].length).trim();
			return {
				content,
				data:
					typeof data === "object" && data !== null
						? (data as Record<string, unknown>)
						: {},
				diagnostics: [] as DocumentSource["articleDiagnostics"],
			};
		} catch (e) {
			console.error("YAML Parse Error:", e);
			return {
				content: text,
				data: {},
				diagnostics: [
					{
						code: "article-frontmatter-invalid",
						severity: "error",
						message:
							"`article.mda` frontmatter YAML is invalid. Preview is blocked until fixed.",
					},
				] as DocumentSource["articleDiagnostics"],
			};
		}
	}, [articleText]);

	const bibData = React.useMemo(
		() => parseBibtexDocument(files[CORE_BIB_FILE] || ""),
		[files],
	);

	const plots = React.useMemo(() => {
		const parsedPlots: Record<string, unknown> = {};
		for (const [fileName, fileContent] of Object.entries(files)) {
			if (!fileName.endsWith(".json")) continue;
			try {
				parsedPlots[fileName] = JSON.parse(fileContent);
			} catch {
				parsedPlots[fileName] = null;
			}
		}
		return parsedPlots;
	}, [files]);

	const activeTemplate = React.useMemo(
		() => resolveTemplateFile(files[CORE_TEMPLATE_FILE]),
		[files],
	);

	const resolvedTemplateForTarget = React.useMemo(
		() => resolveTemplateForTarget(activeTemplate.template, target),
		[activeTemplate.template, target],
	);

	const citationStyle = React.useMemo(
		() => resolvedTemplateForTarget.citationStyle || "author-year",
		[resolvedTemplateForTarget.citationStyle],
	);

	const blockingByFile = React.useMemo(() => {
		const result: Partial<Record<string, string>> = {};
		if (activeTemplate.hasError) {
			result[CORE_TEMPLATE_FILE] =
				"Fix template errors before switching away from `template.json`.";
		}
		if (bibData.hasError) {
			result[CORE_BIB_FILE] =
				"Fix BibTeX errors before switching away from `references.bib`.";
		}
		if (parsed.diagnostics.some((diag) => diag.severity === "error")) {
			result[CORE_ARTICLE_FILE] =
				"Fix article parsing errors before switching away from `article.mda`.";
		}
		return result;
	}, [activeTemplate.hasError, bibData.hasError, parsed.diagnostics]);

	return {
		content: parsed.content,
		frontmatter: parsed.data,
		citations: bibData.citations,
		plots,
		template: resolvedTemplateForTarget,
		citationStyle,
		templateDiagnostics: activeTemplate.diagnostics,
		bibDiagnostics: bibData.diagnostics,
		articleDiagnostics: parsed.diagnostics,
		blockingByFile,
		isBlockingActiveFile: (fileName) => Boolean(blockingByFile[fileName]),
		hasTemplateError: activeTemplate.hasError,
		hasBlockingError:
			activeTemplate.hasError ||
			bibData.hasError ||
			parsed.diagnostics.some((diag) => diag.severity === "error"),
	};
}
