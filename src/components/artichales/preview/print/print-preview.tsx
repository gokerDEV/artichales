import * as React from "react";
import { ReferencesCorePlugin } from "@/components/artichales/plugins/references.core.plugin";
import { TitleCorePlugin } from "@/components/artichales/plugins/title.core.plugin";
import {
	buildPaginatedPageTree,
	PAGE_LIMIT,
} from "@/components/artichales/preview/print/pagination.service";
import { DocumentRenderContent } from "@/components/artichales/preview/shared/document-render-content";
import { MarkdownContent } from "@/components/artichales/preview/shared/markdown-content";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DocumentSource } from "@/hooks/use-document";
import { cn } from "@/lib/utils";

export type PrintPreviewProps = {
	document: DocumentSource;
	className?: string;
	scale?: number;
};

type PagedPreviewerInstance = {
	preview: (
		content: string,
		stylesheets: string[],
		renderTo: HTMLElement,
	) => Promise<unknown>;
};

function resolvePagedPreviewerFactory(
	module: unknown,
): (() => PagedPreviewerInstance) | null {
	if (typeof module !== "object" || module === null) return null;
	const candidate = module as {
		Previewer?: new () => PagedPreviewerInstance;
		default?: {
			Previewer?: new () => PagedPreviewerInstance;
		};
	};
	const previewerCtor = candidate.Previewer;
	if (previewerCtor) {
		return () => new previewerCtor();
	}
	const defaultPreviewerCtor = candidate.default?.Previewer;
	if (defaultPreviewerCtor) {
		return () => new defaultPreviewerCtor();
	}
	return null;
}

export function PrintPreview({
	document,
	className,
	scale = 100,
}: PrintPreviewProps) {
	const { template, frontmatter } = document;
	const enabledPluginIds = React.useMemo(
		() =>
			new Set([
				...document.activePluginIds.core,
				...document.activePluginIds.render,
			]),
		[document.activePluginIds.core, document.activePluginIds.render],
	);
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
	const pagedSourceRef = React.useRef<HTMLDivElement | null>(null);
	const pagedPreviewRef = React.useRef<HTMLDivElement | null>(null);
	const [pagedStatus, setPagedStatus] = React.useState<
		"idle" | "loading" | "ready" | "error"
	>("idle");
	const [pagedError, setPagedError] = React.useState<string | null>(null);
	const [pagedWasTruncated, setPagedWasTruncated] = React.useState(false);

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

		return `@page { size: ${pageSize} ${orientation}; margin: ${marginTop} ${marginRight} ${marginBottom} ${marginLeft}; }
.paged-print-content .artichales__body { column-count: ${defaultColumns}; column-gap: ${columnGap}; }
.paged-print-content .pagedjs_first_page .artichales__body { column-count: ${firstPageColumns}; }`;
	}, [
		columnGap,
		margins,
		pageConfig?.orientation,
		pageConfig?.size,
		template.layout,
	]);
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
		const runPagedPreview = async () => {
			if (!pagedSourceRef.current || !pagedPreviewRef.current) return;
			setPagedStatus("loading");
			setPagedError(null);
			setPagedWasTruncated(false);
			pagedPreviewRef.current.innerHTML = "";

			try {
				const pagedModule = await import("pagedjs");
				const createPreviewer = resolvePagedPreviewerFactory(pagedModule);
				if (!createPreviewer) {
					throw new Error("Paged.js Previewer export is unavailable.");
				}

				const previewer = createPreviewer();
				await previewer.preview(
					pagedSourceRef.current.innerHTML,
					[],
					pagedPreviewRef.current,
				);

				if (cancelled) return;

				const renderedPages = Array.from(
					pagedPreviewRef.current.querySelectorAll(".pagedjs_page"),
				);
				if (renderedPages.length > PAGE_LIMIT) {
					for (const page of renderedPages.slice(PAGE_LIMIT)) {
						page.remove();
					}
					setPagedWasTruncated(true);
				}

				setPagedStatus("ready");
			} catch (error) {
				console.error("Paged.js preview failed, falling back:", error);
				if (cancelled) return;
				setPagedStatus("error");
				setPagedError(
					"Paged.js preview failed. Falling back to legacy print stack.",
				);
			}
		};

		runPagedPreview();
		return () => {
			cancelled = true;
		};
	}, [pagedPreviewKey]);

	return (
		<div className={cn("absolute inset-0 bg-neutral-100", className)}>
			<div className="pointer-events-none absolute top-0 -left-[200vw] opacity-0">
				<div ref={pagedSourceRef}>
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
			<ScrollArea className="h-full w-full">
				<div
					data-artichales-print-preview-shell="true"
					className="flex w-full flex-col items-center gap-8 p-8 transition-transform duration-200"
					style={{
						transform: `scale(${scale / 100})`,
						transformOrigin: "top center",
						backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${pageHeightPx - 24}px, rgb(226 232 240) ${pageHeightPx - 24}px, rgb(226 232 240) ${pageHeightPx}px)`,
					}}
				>
					{pagedStatus !== "error" ? (
						<>
							{pagedStatus === "loading" || pagedStatus === "idle" ? (
								<div className="w-full max-w-[210mm] border border-muted bg-background p-4 text-muted-foreground text-sm">
									Preparing Paged.js print preview...
								</div>
							) : null}
							{pagedWasTruncated ? (
								<div className="w-full max-w-[210mm] border border-amber-300 bg-amber-50 p-3 text-amber-800 text-sm">
									Print preview was limited to {PAGE_LIMIT} pages. Reduce
									content or adjust layout to view all pages.
								</div>
							) : null}
							<div
								ref={pagedPreviewRef}
								className="paged-print-content w-full"
								data-artichales-pagedjs-preview="true"
							/>
						</>
					) : (
						<>
							{pagedError ? (
								<div className="w-full max-w-[210mm] border border-amber-300 bg-amber-50 p-3 text-amber-800 text-sm">
									{pagedError}
								</div>
							) : null}
							{paginatedTree.wasTruncated ? (
								<div className="w-full max-w-[210mm] border border-amber-300 bg-amber-50 p-3 text-amber-800 text-sm">
									Print preview was limited to {PAGE_LIMIT} pages. Reduce
									content or adjust layout to view all pages.
								</div>
							) : null}
							{paginatedTree.pages.map((page) => {
								const headerRegion = page.regions.find(
									(r) => r.type === "header",
								);
								const bodyRegion = page.regions.find((r) => r.type === "body");
								const footerRegion = page.regions.find(
									(r) => r.type === "footer",
								);
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
													<span className="text-center">
														{headerRegion.center}
													</span>
													<span className="text-right">
														{headerRegion.right}
													</span>
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
													<span className="text-center">
														{footerRegion.center}
													</span>
													<span className="text-right">
														{footerRegion.right}
													</span>
												</div>
											</div>
										) : null}

										<div
											className="artichales artichales--print mx-auto h-full w-full text-[11px] text-black leading-relaxed"
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
													columnGap,
													columnFill: "auto",
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
														if (!enabledPluginIds.has("title-core"))
															return null;
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
														if (!enabledPluginIds.has("references-core"))
															return null;
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
																resolvedReferences={document.resolvedReferences}
																activeParserPluginIds={
																	document.activePluginIds.parser
																}
																activeRenderPluginIds={
																	document.activePluginIds.render
																}
																indexContent={document.content}
																templateDefaults={{
																	components:
																		document.template.componentDefaults,
																}}
																utilityClasses={document.template.utilities}
															/>
														</div>
													);
												})}
											</div>
										</div>
									</div>
								);
							})}
						</>
					)}
				</div>
			</ScrollArea>
		</div>
	);
}
