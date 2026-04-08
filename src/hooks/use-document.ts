import type { JSX } from "react";
import * as React from "react";
import { parse as parseYaml } from "yaml";
import type { PreviewTarget } from "@/components/artichales/panels/preview-header";
import type { CitationEntry } from "@/lib/bibtex";
import { parseBibtex } from "@/lib/bibtex";

type RenderTarget = "web" | "print";

type DocumentStyle = {
	columns?: number;
	fontFamily?: {
		body?: string;
		heading?: string;
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
	id?: string;
	target?: RenderTarget;
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
	headings?: {
		h1?: {
			marginTop?: string;
			marginBottom?: string;
		};
		h2?: {
			marginTop?: string;
			marginBottom?: string;
		};
		h3?: {
			marginTop?: string;
			marginBottom?: string;
		};
	};
	headerFooter?: {
		enabled?: boolean;
		header?: {
			left?: string;
			center?: string;
			right?: string;
		};
		footer?: {
			left?: string;
			center?: string;
			right?: string;
		};
	};
};

export interface DocumentSource {
	content: string;
	frontmatter: Record<string, unknown>;
	citations: Record<string, CitationEntry>;
	plots: Record<string, unknown>;
	template: DocumentTemplate;
	citationStyle: string;
}

type TemplateFileConfig = {
	web?: DocumentTemplate;
	print?: DocumentTemplate;
};

const DEFAULT_WEB_TEMPLATE: DocumentTemplate = {
	id: "classic_web",
	target: "web",
	container: "article",
	headerFooter: {
		enabled: false,
	},
};

const DEFAULT_PRINT_TEMPLATE: DocumentTemplate = {
	id: "classic_print",
	target: "print",
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
	document: {
		columns: 1,
		lineHeight: 1.55,
		fontFamily: {
			body: "Source Serif 4",
			heading: "Inter",
		},
		fontSize: {
			body: "11pt",
			h1: "20pt",
			h2: "15pt",
			h3: "12pt",
		},
		textAlign: "justify",
	},
	titleBlock: {
		enabled: true,
		align: "center",
		showAuthors: true,
		showAffiliations: true,
		showKeywords: true,
		spacingAfter: "12mm",
	},
	headerFooter: {
		enabled: true,
		header: {
			left: "",
			center: "",
			right: "{title}",
		},
		footer: {
			left: "",
			center: "{pageNumber}",
			right: "",
		},
	},
};

function mergeTemplate(
	base: DocumentTemplate,
	override: DocumentTemplate,
): DocumentTemplate {
	return {
		...base,
		...override,
		page: {
			...base.page,
			...override.page,
			margin: {
				...base.page?.margin,
				...override.page?.margin,
			},
		},
		document: {
			...base.document,
			...override.document,
			fontFamily: {
				...base.document?.fontFamily,
				...override.document?.fontFamily,
			},
			fontSize: {
				...base.document?.fontSize,
				...override.document?.fontSize,
			},
		},
		titleBlock: {
			...base.titleBlock,
			...override.titleBlock,
		},
		headings: {
			...base.headings,
			...override.headings,
			h1: { ...base.headings?.h1, ...override.headings?.h1 },
			h2: { ...base.headings?.h2, ...override.headings?.h2 },
			h3: { ...base.headings?.h3, ...override.headings?.h3 },
		},
		headerFooter: {
			...base.headerFooter,
			...override.headerFooter,
			header: {
				...base.headerFooter?.header,
				...override.headerFooter?.header,
			},
			footer: {
				...base.headerFooter?.footer,
				...override.headerFooter?.footer,
			},
		},
	};
}

export function useDocument(
	files: Record<string, string>,
	activeFile: string,
	target: PreviewTarget,
): DocumentSource {
	const parsed = React.useMemo(() => {
		const text = files[activeFile] || "";
		// Naive frontmatter splitting
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

	const templateFile = React.useMemo(() => {
		const rawTemplate = files["template.json"];
		if (!rawTemplate) return null;
		try {
			const parsed = JSON.parse(rawTemplate) as TemplateFileConfig;
			return parsed;
		} catch (error) {
			console.error("Template Parse Error:", error);
			return null;
		}
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

	const templateName =
		typeof parsed.data.template === "string" ? parsed.data.template : "classic";

	const activeTemplate = React.useMemo(() => {
		const normalizedTemplateName = templateName.toLowerCase();
		if (normalizedTemplateName !== "classic") {
			return target === "web" ? DEFAULT_WEB_TEMPLATE : DEFAULT_PRINT_TEMPLATE;
		}

		const fromFile = templateFile?.[target];
		if (!fromFile || typeof fromFile !== "object") {
			return target === "web" ? DEFAULT_WEB_TEMPLATE : DEFAULT_PRINT_TEMPLATE;
		}

		return mergeTemplate(
			target === "web" ? DEFAULT_WEB_TEMPLATE : DEFAULT_PRINT_TEMPLATE,
			{
				...fromFile,
				target,
			},
		);
	}, [templateName, target, templateFile]);

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

		return overrideStyle || "author-year";
	}, [parsed.data.references]);

	return {
		content: parsed.content,
		frontmatter: parsed.data,
		citations,
		plots,
		template: activeTemplate,
		citationStyle,
	};
}
