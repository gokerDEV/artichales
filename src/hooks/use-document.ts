import type { JSX } from "react";
import * as React from "react";
import { parse as parseYaml } from "yaml";
import type { PreviewTarget } from "@/components/artichales/panels/preview-header";
import type { CitationEntry } from "@/lib/bibtex";
import { parseBibtex } from "@/lib/bibtex";
import { parseTemplateFile } from "@/lib/template";

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
};

export interface DocumentSource {
	content: string;
	frontmatter: Record<string, unknown>;
	citations: Record<string, CitationEntry>;
	plots: Record<string, unknown>;
	template: DocumentTemplate;
	citationStyle: string;
}

function resolveTemplateForTarget(
	rawTemplateText: string | undefined,
	target: PreviewTarget,
): DocumentTemplate {
	const templateFile = parseTemplateFile(rawTemplateText);
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
	};

	return {
		...baseTemplate,
		target,
	};
}

export function useDocument(
	files: Record<string, string>,
	activeFile: string,
	target: PreviewTarget,
): DocumentSource {
	const parsed = React.useMemo(() => {
		const text = files[activeFile] || "";
		const match = text.match(/^---\n([\s\S]*?)\n---/);
		if (!match) return { content: text, data: {} };

		try {
			const data = parseYaml(match[1]);
			const content = text.slice(match[0].length).trim();
			return {
				content,
				data:
					typeof data === "object" && data !== null
						? (data as Record<string, unknown>)
						: {},
			};
		} catch (e) {
			console.error("YAML Parse Error:", e);
			return { content: text, data: {} };
		}
	}, [files, activeFile]);

	const citations = React.useMemo(() => {
		return parseBibtex(files["references.bib"] || "");
	}, [files]);

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
		() => resolveTemplateForTarget(files["template.json"], target),
		[files, target],
	);

	const citationStyle = React.useMemo(() => {
		const refs = parsed.data.references;
		let overrideStyle: string | undefined;

		if (Array.isArray(refs)) {
			const styleObj = refs.find(
				(r) => r && typeof r === "object" && "style" in r,
			);
			overrideStyle = styleObj ? String(styleObj.style) : undefined;
		} else if (refs && typeof refs === "object" && "style" in refs) {
			overrideStyle = String((refs as { style: unknown }).style);
		}

		return overrideStyle || activeTemplate.citationStyle || "author-year";
	}, [parsed.data.references, activeTemplate.citationStyle]);

	return {
		content: parsed.content,
		frontmatter: parsed.data,
		citations,
		plots,
		template: activeTemplate,
		citationStyle,
	};
}
