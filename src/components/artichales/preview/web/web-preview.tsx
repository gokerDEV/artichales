import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { remarkAbstract } from "@/components/artichales/plugins/abstract.parser.plugin";
import { AbstractRender } from "@/components/artichales/plugins/abstract.render.plugin";
import { remarkCitation } from "@/components/artichales/plugins/citation.parser.plugin";
import { CitationRender } from "@/components/artichales/plugins/citation.render.plugin";
import "katex/dist/katex.min.css";
import { ReferencesCorePlugin } from "@/components/artichales/plugins/references.core.plugin";
import { TitleCorePlugin } from "@/components/artichales/plugins/title.core.plugin";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DocumentSource } from "@/hooks/use-document";
import { cn } from "@/lib/utils";

export type WebPreviewProps = {
	document: DocumentSource;
	className?: string;
	scale?: number;
};

export function WebPreview({
	document,
	className,
	scale = 100,
}: WebPreviewProps) {
	const { content, template } = document;

	const isWeb = template?.target === "web";
	const Container = isWeb ? template.container || "article" : "article";
	const HeadingClass =
		template?.headings?.numbering === false ? "" : "prose-headings:font-bold";
	const ZoomedImages = template?.figures?.zoomable
		? "prose-img:cursor-zoom-in"
		: "";

	return (
		<div className={cn("absolute inset-0 bg-background", className)}>
			<ScrollArea className="h-full w-full">
				<div
					className="flex min-w-max justify-center p-4 transition-transform duration-200"
					style={{
						transform: `scale(${scale / 100})`,
						transformOrigin: "top center",
						paddingBottom: `calc(40vh * ${scale / 100})`,
					}}
				>
					<Container className="w-[800px] shrink-0 rounded-xl border border-border bg-card p-12 shadow-sm md:p-16">
						<TitleCorePlugin document={document} target="web" />

						<article
							className={cn(
								"prose prose-slate dark:prose-invert max-w-none",
								"prose-a:text-emerald-600 hover:prose-a:text-emerald-500",
								"prose-img:rounded-xl prose-img:border prose-img:border-border prose-img:shadow-sm",
								"prose-pre:border prose-pre:border-border",
								"prose-blockquote:border-emerald-500 prose-blockquote:border-l-4 prose-blockquote:bg-emerald-50/50 prose-blockquote:py-1 prose-blockquote:pr-4 dark:prose-blockquote:bg-emerald-950/20",
								HeadingClass,
								ZoomedImages,
							)}
						>
							<ReactMarkdown
								remarkPlugins={[
									remarkCitation,
									remarkAbstract,
									remarkGfm,
									remarkMath,
									remarkDirective,
								]}
								rehypePlugins={[rehypeKatex]}
								components={{ cite: CitationRender, div: AbstractRender }}
							>
								{content}
							</ReactMarkdown>
						</article>

						<ReferencesCorePlugin document={document} target="web" />
					</Container>
				</div>
			</ScrollArea>
		</div>
	);
}
