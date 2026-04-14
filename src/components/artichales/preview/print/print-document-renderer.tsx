import * as React from "react";
import { buildPrintStylesheet } from "@/components/artichales/preview/print/build-print-stylesheet";
import { runPagedPreview } from "@/components/artichales/preview/print/paged-preview-engine";
import { usePrintStylesheet } from "@/components/artichales/preview/print/use-print-stylesheet";
import { DocumentRenderContent } from "@/components/artichales/preview/shared/document-render-content";
import type { DocumentSource } from "@/hooks/use-document";
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
	const [showSourceTree, setShowSourceTree] = React.useState(true);
	const [status, setStatus] = React.useState<
		"idle" | "loading" | "ready" | "error"
	>("idle");
	const [error, setError] = React.useState<string | null>(null);
	const pagedCss = React.useMemo(
		() => buildPrintStylesheet(document),
		[document],
	);
	usePrintStylesheet(pagedCss, "export");

	const renderKey = React.useMemo(
		() =>
			JSON.stringify({
				template: document.template,
				frontmatter: document.frontmatter,
				renderVersion: document.renderVersion,
				references: document.renderedReferences.length,
				pagedCss,
			}),
		[
			document.frontmatter,
			document.renderVersion,
			document.renderedReferences.length,
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
			if (!sourceElement || !outputElement) return;

			setStatus("loading");
			setError(null);
			setShowSourceTree(true);
			try {
				const stylesheetUrl = URL.createObjectURL(
					new Blob([pagedCss], { type: "text/css" }),
				);
				await (async () => {
					try {
						await runPagedPreview({
							sourceHtml: sourceElement.innerHTML,
							mountRoot: outputElement,
							stylesheets: [stylesheetUrl],
						});
					} finally {
						URL.revokeObjectURL(stylesheetUrl);
					}
				})();
				if (cancelled || currentSequence !== renderSequenceRef.current) return;
				setStatus("ready");
				setShowSourceTree(false);
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
	}, [onReadyToPrint, renderKey, pagedCss]);

	return (
		<div
			className={cn("art-print-document relative mx-auto w-full", className)}
			data-art-print-document="true"
		>
			{showSourceTree ? (
				<div className="pointer-events-none absolute top-0 -left-[200vw] opacity-0">
					<div ref={sourceRef}>
						<div className="paged-print-content">
							<DocumentRenderContent
								document={document}
								target="print"
								articleClassName="artichales__body"
							/>
						</div>
					</div>
				</div>
			) : null}
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
