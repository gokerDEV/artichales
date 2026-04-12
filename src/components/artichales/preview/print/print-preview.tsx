import * as React from "react";
import { buildPrintStylesheet } from "@/components/artichales/preview/print/build-print-stylesheet";
import { runPagedPreview } from "@/components/artichales/preview/print/paged-preview-engine";
import { usePrintStylesheet } from "@/components/artichales/preview/print/use-print-stylesheet";
import { DocumentRenderContent } from "@/components/artichales/preview/shared/document-render-content";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DocumentSource } from "@/hooks/use-document";
import { cn } from "@/lib/utils";

export type PrintPreviewProps = {
	document: DocumentSource;
	className?: string;
	scale?: number;
};

const PAGE_LIMIT = 40;

export function PrintPreviewPane({
	document,
	className,
	scale = 100,
}: PrintPreviewProps) {
	const { template } = document;
	const pagedSourceRef = React.useRef<HTMLDivElement | null>(null);
	const pagedPreviewRef = React.useRef<HTMLDivElement | null>(null);
	const renderSequenceRef = React.useRef(0);
	const [pagedStatus, setPagedStatus] = React.useState<
		"idle" | "loading" | "ready" | "error"
	>("idle");
	const [pagedError, setPagedError] = React.useState<string | null>(null);
	const [pagedWasTruncated, setPagedWasTruncated] = React.useState(false);

	const pageConfig = template?.page;
	const pageHeightPx = pageConfig?.orientation === "landscape" ? 794 : 1123;
	const pagedCss = React.useMemo(
		() => buildPrintStylesheet(document),
		[document],
	);
	usePrintStylesheet(pagedCss, "preview");
	const pagedPreviewKey = React.useMemo(
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
		void pagedPreviewKey;
		let cancelled = false;
		const currentSequence = ++renderSequenceRef.current;
		const renderPagedPreview = async () => {
			const sourceElement = pagedSourceRef.current;
			const previewElement = pagedPreviewRef.current;
			if (!sourceElement || !previewElement) return;
			setPagedStatus("loading");
			setPagedError(null);
			setPagedWasTruncated(false);
			const viewport = previewElement.closest(
				"[data-radix-scroll-area-viewport]",
			) as HTMLElement | null;
			const previousScrollTop = viewport?.scrollTop ?? 0;
			const previousScrollHeight = viewport?.scrollHeight ?? 0;

			try {
				const stylesheetUrl = URL.createObjectURL(
					new Blob([pagedCss], { type: "text/css" }),
				);
				const { wasTruncated } = await (async () => {
					try {
						return await runPagedPreview({
							sourceHtml: sourceElement.innerHTML,
							mountRoot: previewElement,
							pageLimit: PAGE_LIMIT,
							stylesheets: [stylesheetUrl],
						});
					} finally {
						URL.revokeObjectURL(stylesheetUrl);
					}
				})();

				if (
					cancelled ||
					currentSequence !== renderSequenceRef.current ||
					!pagedPreviewRef.current
				) {
					return;
				}
				setPagedWasTruncated(wasTruncated);
				if (viewport) {
					window.requestAnimationFrame(() => {
						const nextScrollHeight = viewport.scrollHeight;
						if (previousScrollHeight > 0 && nextScrollHeight > 0) {
							viewport.scrollTop =
								(previousScrollTop / previousScrollHeight) * nextScrollHeight;
							return;
						}
						viewport.scrollTop = previousScrollTop;
					});
				}
				setPagedStatus("ready");
			} catch (error) {
				console.error("Paged.js preview failed:", error);
				if (cancelled || currentSequence !== renderSequenceRef.current) return;
				if (viewport) {
					viewport.scrollTop = previousScrollTop;
				}
				setPagedStatus("error");
				setPagedError(
					"Paged.js preview failed. Check browser console for details.",
				);
			}
		};

		const timeout = window.setTimeout(() => {
			void renderPagedPreview();
		}, 280);
		return () => {
			window.clearTimeout(timeout);
			cancelled = true;
		};
	}, [pagedCss, pagedPreviewKey]);

	return (
		<div
			className={cn("absolute inset-0 bg-neutral-100", className)}
			data-art-print-container="true"
		>
			<div
				className="pointer-events-none absolute top-0 -left-[200vw] opacity-0"
				data-art-print-source="true"
			>
				<div ref={pagedSourceRef}>
					<div className="paged-print-content">
						<DocumentRenderContent
							document={document}
							target="print"
							articleClassName="artichales__body"
						/>
					</div>
				</div>
			</div>
			<ScrollArea className="h-full w-full" data-art-print-scroll="true">
				<div
					data-art-print-preview-shell="true"
					className="flex w-full flex-col items-center gap-8 p-8 transition-transform duration-200"
					style={{
						transform: `scale(${scale / 100})`,
						transformOrigin: "top center",
						backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${pageHeightPx - 24}px, rgb(226 232 240) ${pageHeightPx - 24}px, rgb(226 232 240) ${pageHeightPx}px)`,
					}}
				>
					{pagedStatus === "loading" || pagedStatus === "idle" ? (
						<div className="w-full max-w-[210mm] border border-muted bg-background p-4 text-muted-foreground text-sm">
							Preparing Paged.js print preview...
						</div>
					) : null}
					{pagedError ? (
						<div className="w-full max-w-[210mm] border border-amber-300 bg-amber-50 p-3 text-amber-800 text-sm">
							{pagedError}
						</div>
					) : null}
					{pagedWasTruncated ? (
						<div className="w-full max-w-[210mm] border border-amber-300 bg-amber-50 p-3 text-amber-800 text-sm">
							Print preview was limited to {PAGE_LIMIT} pages. Reduce content or
							adjust layout to view all pages.
						</div>
					) : null}
					<div
						ref={pagedPreviewRef}
						className="paged-print-content w-full"
						data-art-pagedjs-preview="true"
					/>
				</div>
			</ScrollArea>
		</div>
	);
}

// Backward-compatible alias during migration.
export const PrintPreview = PrintPreviewPane;
