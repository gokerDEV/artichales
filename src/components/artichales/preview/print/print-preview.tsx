import * as React from "react";
import { ReferencesCorePlugin } from "@/components/artichales/plugins/references.core.plugin";
import { TitleCorePlugin } from "@/components/artichales/plugins/title.core.plugin";
import { buildPaginatedPageTree } from "@/components/artichales/preview/print/pagination.service";
import { MarkdownContent } from "@/components/artichales/preview/shared/markdown-content";
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
	const paginatedTree = React.useMemo(
		() =>
			buildPaginatedPageTree({
				content: document.content,
				template: template,
				title: typeof frontmatter?.title === "string" ? frontmatter.title : "",
				includeTitleNode: true,
				includeReferencesNode: true,
			}),
		[document.content, template, frontmatter],
	);

	const docStyle = template?.document || {};
	const pageConfig = template?.page;
	const margins = pageConfig?.margin;
	const pagePaddingTop =
		typeof margins?.top === "string" ? margins.top : "24mm";
	const pagePaddingRight =
		typeof margins?.right === "string" ? margins.right : "20mm";
	const pagePaddingBottom =
		typeof margins?.bottom === "string" ? margins.bottom : "24mm";
	const pagePaddingLeft =
		typeof margins?.left === "string" ? margins.left : "20mm";
	const showHeaderFooter = template?.headerFooter?.enabled !== false;
	const headerArea = showHeaderFooter ? "10mm" : "0mm";
	const footerArea = showHeaderFooter ? "10mm" : "0mm";
	const pageHeightPx = pageConfig?.orientation === "landscape" ? 794 : 1123;

	return (
		<div className={cn("absolute inset-0 bg-neutral-100", className)}>
			<ScrollArea className="h-full w-full">
				<div
					data-artichales-print-preview-shell="true"
					className="flex min-w-max flex-col items-center gap-8 p-8 transition-transform duration-200"
					style={{
						transform: `scale(${scale / 100})`,
						transformOrigin: "top center",
						backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${pageHeightPx - 24}px, rgb(226 232 240) ${pageHeightPx - 24}px, rgb(226 232 240) ${pageHeightPx}px)`,
					}}
				>
					{paginatedTree.pages.map((page) => {
						const headerRegion = page.regions.find((r) => r.type === "header");
						const bodyRegion = page.regions.find((r) => r.type === "body");
						const footerRegion = page.regions.find((r) => r.type === "footer");
						if (!bodyRegion || bodyRegion.type !== "body") return null;

						return (
							<div
								key={`print-page-${page.number}`}
								data-artichales-print-root="true"
								data-artichales-print-page="true"
								className="relative shrink-0 rounded-none bg-white shadow-xl ring-1 ring-border"
								style={{
									width: paginatedTree.pageBox.width,
									height: paginatedTree.pageBox.height,
									fontFamily: docStyle.fontFamily?.body,
									fontSize: docStyle.fontSize?.body,
									lineHeight: docStyle.lineHeight,
									textAlign: docStyle.textAlign,
								}}
							>
								{showHeaderFooter &&
								headerRegion &&
								headerRegion.type === "header" ? (
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
											<span className="text-left">{headerRegion.left}</span>
											<span className="text-center">{headerRegion.center}</span>
											<span className="text-right">{headerRegion.right}</span>
										</div>
									</div>
								) : null}

								{showHeaderFooter &&
								footerRegion &&
								footerRegion.type === "footer" ? (
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
											<span className="text-left">{footerRegion.left}</span>
											<span className="text-center">{footerRegion.center}</span>
											<span className="text-right">{footerRegion.right}</span>
										</div>
									</div>
								) : null}

								<div
									className="mx-auto h-full w-full text-[11px] text-black leading-relaxed"
									style={{
										paddingTop: `calc(${pagePaddingTop} + ${headerArea})`,
										paddingRight: pagePaddingRight,
										paddingBottom: `calc(${pagePaddingBottom} + ${footerArea})`,
										paddingLeft: pagePaddingLeft,
									}}
								>
									<div
										className="h-full"
										style={{
											// Default document flow is column-based; page-span nodes use `column-span: all`
											// and automatically return control to the configured column count afterward.
											columnCount: bodyRegion.columns,
											columnGap: "7mm",
										}}
									>
										{bodyRegion.nodes.map((node) => {
											const spanClass =
												node.layoutHint.span === "page"
													? "print-flow-span-page"
													: "print-flow-span-column";
											const breakBeforeClass =
												node.layoutHint.breakBefore === "page"
													? "print-flow-break-before-page"
													: "";
											const breakAfterClass =
												node.layoutHint.breakAfter === "page"
													? "print-flow-break-after-page"
													: "";
											const flowClass = cn(
												"print-flow-node mb-3 break-inside-avoid",
												spanClass,
												breakBeforeClass,
												breakAfterClass,
											);

											if (node.kind === "title") {
												return (
													<div key={node.id} className={flowClass}>
														<TitleCorePlugin
															document={document}
															target="print"
														/>
													</div>
												);
											}
											if (node.kind === "references") {
												return (
													<div key={node.id} className={flowClass}>
														<ReferencesCorePlugin
															document={document}
															target="print"
														/>
													</div>
												);
											}
											return (
												<div key={node.id} className={flowClass}>
													<MarkdownContent
														content={node.markdown || ""}
														plotFiles={document.plots}
														target="print"
														indexContent={document.content}
													/>
												</div>
											);
										})}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</ScrollArea>
		</div>
	);
}
