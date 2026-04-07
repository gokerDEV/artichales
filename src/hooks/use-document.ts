import type { JSX } from "react";
import * as React from "react";
import { parse as parseYaml } from "yaml";
import type { PreviewTarget } from "@/components/artichales/panels/preview-header";
import type { CitationEntry } from "@/lib/bibtex";
import { parseBibtex } from "@/lib/bibtex";

type RenderTarget = "web" | "print";

type DocumentStyle = {
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
		numbering?: boolean;
	};
	figures?: {
		zoomable?: boolean;
	};
	references?: {
		enabled?: boolean;
		title?: string;
	};
	citations?: {
		style?: string;
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

const CLASSIC_WEB_TEMPLATE: DocumentTemplate = {
	id: "classic_web",
	target: "web",
	container: "article",
	headings: {
		numbering: true,
	},
	figures: {
		zoomable: true,
	},
	references: {
		enabled: true,
		title: "References",
	},
	citations: {
		style: "numeric",
	},
};

const CLASSIC_PRINT_TEMPLATE: DocumentTemplate = {
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
	headings: {
		numbering: true,
	},
	figures: {
		zoomable: false,
	},
	references: {
		enabled: true,
		title: "References",
	},
	citations: {
		style: "numeric",
	},
};

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

	const templateByTarget: Record<PreviewTarget, DocumentTemplate> =
		React.useMemo(
			() => ({
				web: CLASSIC_WEB_TEMPLATE,
				print: CLASSIC_PRINT_TEMPLATE,
			}),
			[],
		);

	const activeTemplate = React.useMemo(() => {
		const normalizedTemplateName = templateName.toLowerCase();
		if (normalizedTemplateName === "classic") {
			return templateByTarget[target];
		}
		return templateByTarget[target];
	}, [templateName, target, templateByTarget]);

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

		return overrideStyle || activeTemplate?.citations?.style || "author-year";
	}, [parsed.data.references, activeTemplate?.citations?.style]);

	return {
		content: parsed.content,
		frontmatter: parsed.data,
		citations,
		plots,
		template: activeTemplate,
		citationStyle,
	};
}
