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
	const { template, frontmatter } = document;
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
	const headerFooterConfig = template?.headerFooter;
	const showHeaderFooter = headerFooterConfig?.enabled !== false;

	const resolveTokenText = (value: string | undefined): string => {
		if (!value) return "";
		const title =
			typeof frontmatter?.title === "string" ? frontmatter.title : "";
		return value.replace("{title}", title).replace("{pageNumber}", "");
	};

	const headerLeft = resolveTokenText(headerFooterConfig?.header?.left);
	const headerCenter = resolveTokenText(headerFooterConfig?.header?.center);
	const headerRight = resolveTokenText(headerFooterConfig?.header?.right);

	const footerLeft = resolveTokenText(headerFooterConfig?.footer?.left);
	const footerCenterRaw = headerFooterConfig?.footer?.center || "";
	const footerRight = resolveTokenText(headerFooterConfig?.footer?.right);
	const footerHasPageNumber = footerCenterRaw.includes("{pageNumber}");
	const footerCenter = resolveTokenText(footerCenterRaw);

	const headerArea = showHeaderFooter ? "10mm" : "0mm";
	const footerArea = showHeaderFooter ? "10mm" : "0mm";

	return (
		<div className={cn("absolute inset-0 bg-neutral-100", className)}>
			<ScrollArea className="h-full w-full">
				<div
					data-artichales-print-preview-shell="true"
					className="flex min-w-max justify-center p-8 transition-transform duration-200"
					style={{
						transform: `scale(${scale / 100})`,
						transformOrigin: "top center",
						backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${previewPageHeightPx - 24}px, rgb(226 232 240) ${previewPageHeightPx - 24}px, rgb(226 232 240) ${previewPageHeightPx}px)`,
					}}
				>
					<div
						data-artichales-print-root="true"
						className="relative shrink-0 rounded-none bg-white shadow-xl ring-1 ring-border"
						style={{
							width: pageWidth,
							minHeight: pageHeight,
							fontFamily: docStyle.fontFamily?.body,
							fontSize: docStyle.fontSize?.body,
							lineHeight: docStyle.lineHeight,
							textAlign: docStyle.textAlign,
						}}
					>
						{showHeaderFooter ? (
							<div
								data-artichales-print-header="true"
								className="pointer-events-none absolute text-[10px] text-neutral-500"
								style={{
									top: pagePaddingTop,
									left: pagePaddingLeft,
									right: pagePaddingRight,
								}}
							>
								<div className="grid grid-cols-3 gap-2">
									<span className="text-left">{headerLeft}</span>
									<span className="text-center">{headerCenter}</span>
									<span className="text-right">{headerRight}</span>
								</div>
							</div>
						) : null}
						{showHeaderFooter ? (
							<div
								data-artichales-print-footer="true"
								className="pointer-events-none absolute text-[10px] text-neutral-500"
								style={{
									bottom: pagePaddingBottom,
									left: pagePaddingLeft,
									right: pagePaddingRight,
								}}
							>
								<div className="grid grid-cols-3 gap-2">
									<span className="text-left">{footerLeft}</span>
									<span className="text-center">
										{footerCenter}
										{footerHasPageNumber ? (
											<span data-artichales-page-number="true" />
										) : null}
									</span>
									<span className="text-right">{footerRight}</span>
								</div>
							</div>
						) : null}
						<div
							className="mx-auto min-h-full w-full space-y-6 text-[11px] text-black leading-relaxed"
							style={{
								paddingTop: `calc(${pagePaddingTop} + ${headerArea})`,
								paddingRight: pagePaddingRight,
								paddingBottom: `calc(${pagePaddingBottom} + ${footerArea})`,
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
