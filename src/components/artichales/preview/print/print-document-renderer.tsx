import * as React from "react";
import { runPagedPreview } from "@/components/artichales/preview/print/paged-preview-engine";
import { DocumentRenderContent } from "@/components/artichales/preview/shared/document-render-content";
import type { DocumentSource } from "@/hooks/use-document";
import type { ResolvedMarginConfig } from "@/lib/template";
import { cn } from "@/lib/utils";

export type PrintDocumentRendererProps = {
	document: DocumentSource;
	className?: string;
	onReadyToPrint?: () => void;
};

export function PrintDocumentRenderer({
	document,
	className,
	onReadyToPrint,
}: PrintDocumentRendererProps) {
	const sourceRef = React.useRef<HTMLDivElement | null>(null);
	const outputRef = React.useRef<HTMLDivElement | null>(null);
	const renderSequenceRef = React.useRef(0);
	const [status, setStatus] = React.useState<
		"idle" | "loading" | "ready" | "error"
	>("idle");
	const [error, setError] = React.useState<string | null>(null);
	const { template } = document;

	const pageConfig = template?.page;
	const margins = pageConfig?.margin;
	const columnGap = template.layout?.columnGap || "7mm";
	const pagedCss = React.useMemo(() => {
		const orientation =
			pageConfig?.orientation === "landscape" ? "landscape" : "portrait";
		const pageSize = pageConfig?.size || "A4";
		const marginTop = typeof margins?.top === "string" ? margins.top : "24mm";
		const marginRight =
			typeof margins?.right === "string" ? margins.right : "20mm";
		const marginBottom =
			typeof margins?.bottom === "string" ? margins.bottom : "24mm";
		const marginLeft =
			typeof margins?.left === "string" ? margins.left : "20mm";
		const defaultColumns = Math.max(
			1,
			template.layout?.defaultPageColumns || 2,
		);
		const firstPageColumns = Math.max(
			1,
			template.layout?.firstPageColumns || 1,
		);

		const formatContent = (str: string | undefined) => {
			if (!str) return "none";
			const tokens = str.split(/(\{.*?\})/g).filter(Boolean);
			const cssTokens = tokens.map((token) => {
				if (token === "{pageNumber}") return "counter(page)";
				if (token === "{totalPages}") return "counter(pages)";
				if (token.startsWith("{") && token.endsWith("}")) {
					const path = token.slice(1, -1).trim().split(".");
					let value: unknown = document.frontmatter;
					for (const key of path) {
						if (value == null || typeof value !== "object") break;
						value = (value as Record<string, unknown>)[key];
					}
					return `"${String(value ?? "").replaceAll('"', '\\"')}"`;
				}
				return `"${token.replaceAll('"', '\\"')}"`;
			});
			return cssTokens.join(" ");
		};

		const pageMargins = template.pageMargins;
		const createZoneCss = (
			pageSelector: string,
			state: "first" | "odd" | "even",
			config: ResolvedMarginConfig | undefined,
			baseStr: string,
		) => {
			if (!config?.enabled) return "";
			const segs = config[state];
			if (!segs) return "";
			return `
@page ${pageSelector} {
	@${baseStr}-left { content: ${formatContent(segs.left)}; text-align: left; font-size: 9pt; color: #4b5563; }
	@${baseStr}-center { content: ${formatContent(segs.center)}; text-align: center; font-size: 9pt; color: #4b5563; }
	@${baseStr}-right { content: ${formatContent(segs.right)}; text-align: right; font-size: 9pt; color: #4b5563; }
}`;
		};

		const marginBoxes = `
${createZoneCss(":first", "first", pageMargins?.header, "top")}
${createZoneCss(":first", "first", pageMargins?.footer, "bottom")}
${createZoneCss(":right", "odd", pageMargins?.header, "top")}
${createZoneCss(":right", "odd", pageMargins?.footer, "bottom")}
${createZoneCss(":left", "even", pageMargins?.header, "top")}
${createZoneCss(":left", "even", pageMargins?.footer, "bottom")}
`;

		const verticalMarginBoxes = `
@page :first {
	@left-middle { content: ${formatContent(pageMargins?.left?.first?.center)}; writing-mode: vertical-rl; transform: rotate(180deg); }
	@right-middle { content: ${formatContent(pageMargins?.right?.first?.center)}; writing-mode: vertical-rl; }
}
@page :right {
	@left-middle { content: ${formatContent(pageMargins?.left?.odd?.center)}; writing-mode: vertical-rl; transform: rotate(180deg); }
	@right-middle { content: ${formatContent(pageMargins?.right?.odd?.center)}; writing-mode: vertical-rl; }
}
@page :left {
	@left-middle { content: ${formatContent(pageMargins?.left?.even?.center)}; writing-mode: vertical-rl; transform: rotate(180deg); }
	@right-middle { content: ${formatContent(pageMargins?.right?.even?.center)}; writing-mode: vertical-rl; }
}
`;

		return `@page { size: ${pageSize} ${orientation}; margin: ${marginTop} ${marginRight} ${marginBottom} ${marginLeft}; }
.paged-print-content .art__body { column-count: ${defaultColumns}; column-gap: ${columnGap}; }
.paged-print-content .pagedjs_first_page .art__body { column-count: ${firstPageColumns}; }
${marginBoxes}
${verticalMarginBoxes}`;
	}, [
		columnGap,
		document.frontmatter,
		margins,
		pageConfig?.orientation,
		pageConfig?.size,
		template.layout,
		template.pageMargins,
	]);

	const renderKey = React.useMemo(
		() =>
			JSON.stringify({
				content: document.content,
				frontmatter: document.frontmatter,
				template: document.template,
				citations: Object.keys(document.citations).length,
				plots: Object.keys(document.plots).length,
				pagedCss,
			}),
		[
			document.citations,
			document.content,
			document.frontmatter,
			document.plots,
			document.template,
			pagedCss,
		],
	);

	React.useEffect(() => {
		void renderKey;
		let cancelled = false;
		const currentSequence = ++renderSequenceRef.current;
		const run = async () => {
			const sourceElement = sourceRef.current;
			const outputElement = outputRef.current;
			const stagingHost = outputElement?.parentElement;
			if (!sourceElement || !outputElement || !stagingHost) return;

			setStatus("loading");
			setError(null);
			try {
				await runPagedPreview({
					sourceHtml: sourceElement.innerHTML,
					stagingHost,
					mountRoot: outputElement,
				});
				if (cancelled || currentSequence !== renderSequenceRef.current) return;
				setStatus("ready");
				if (onReadyToPrint) {
					window.requestAnimationFrame(() => {
						if (cancelled || currentSequence !== renderSequenceRef.current) {
							return;
						}
						window.setTimeout(() => {
							if (cancelled || currentSequence !== renderSequenceRef.current) {
								return;
							}
							onReadyToPrint();
						}, 0);
					});
				}
			} catch (err) {
				console.error("Print document rendering failed:", err);
				if (cancelled || currentSequence !== renderSequenceRef.current) return;
				setStatus("error");
				setError("Failed to render print document with Paged.js.");
			}
		};

		void run();
		return () => {
			cancelled = true;
		};
	}, [onReadyToPrint, renderKey]);

	return (
		<div
			className={cn("art-print-document relative mx-auto w-full", className)}
			data-art-print-document="true"
		>
			<div className="pointer-events-none absolute top-0 -left-[200vw] opacity-0">
				<div ref={sourceRef}>
					<style>{pagedCss}</style>
					<div className="paged-print-content">
						<DocumentRenderContent
							document={document}
							target="print"
							articleClassName="artichales__body"
						/>
					</div>
				</div>
			</div>
			{status !== "ready" ? (
				<div className="mx-auto my-4 w-full max-w-[210mm] border border-slate-300 bg-white p-3 text-slate-600 text-sm">
					{status === "error"
						? error || "Print rendering failed."
						: "Preparing print document..."}
				</div>
			) : null}
			<div ref={outputRef} className="paged-print-content w-full" />
		</div>
	);
}
