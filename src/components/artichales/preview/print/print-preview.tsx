import { DocumentRenderContent } from "@/components/artichales/preview/shared/document-render-content";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DocumentSource } from "@/hooks/use-document";
import { cn } from "@/lib/utils";

export type PrintPreviewProps = {
	document: DocumentSource;
	className?: string;
	scale?: number;
};

export function PrintPreview({
	document,
	className,
	scale = 100,
}: PrintPreviewProps) {
	const { template } = document;
	const docStyle = template?.document || {};
	const pageConfig = template?.page;
	const orientation =
		pageConfig?.orientation === "landscape" ? "landscape" : "portrait";
	const isA4 = pageConfig?.size === "A4";
	const pageWidth = isA4
		? orientation === "portrait"
			? "210mm"
			: "297mm"
		: "210mm";
	const pageHeight = isA4
		? orientation === "portrait"
			? "297mm"
			: "210mm"
		: "297mm";

	const previewPageHeightPx = isA4
		? orientation === "portrait"
			? 1123
			: 794
		: 1123;

	const margins = pageConfig?.margin;
	const pagePaddingTop =
		typeof margins?.top === "string" ? margins.top : "24mm";
	const pagePaddingRight =
		typeof margins?.right === "string" ? margins.right : "20mm";
	const pagePaddingBottom =
		typeof margins?.bottom === "string" ? margins.bottom : "24mm";
	const pagePaddingLeft =
		typeof margins?.left === "string" ? margins.left : "20mm";

	return (
		<div className={cn("absolute inset-0 bg-neutral-100", className)}>
			<ScrollArea className="h-full w-full">
				<div
					data-artichales-print-preview-shell="true"
					className="flex min-w-max justify-center p-8 transition-transform duration-200"
					style={{
						transform: `scale(${scale / 100})`,
						transformOrigin: "top center",
						height: `calc(${previewPageHeightPx}px * ${scale / 100})`,
					}}
				>
					<div
						data-artichales-print-root="true"
						className="shrink-0 rounded-none bg-white shadow-xl ring-1 ring-border"
						style={{
							width: pageWidth,
							minHeight: pageHeight,
							fontFamily: docStyle.fontFamily?.body,
							fontSize: docStyle.fontSize?.body,
							lineHeight: docStyle.lineHeight,
							textAlign: docStyle.textAlign,
						}}
					>
						<div
							className="mx-auto min-h-full w-full space-y-6 text-[11px] text-black leading-relaxed"
							style={{
								paddingTop: pagePaddingTop,
								paddingRight: pagePaddingRight,
								paddingBottom: pagePaddingBottom,
								paddingLeft: pagePaddingLeft,
							}}
						>
							<DocumentRenderContent
								document={document}
								target="print"
								contentClassName="space-y-3 text-[11px] text-neutral-700"
							/>
						</div>
					</div>
				</div>
			</ScrollArea>
		</div>
	);
}
