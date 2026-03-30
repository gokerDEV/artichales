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
	const { content, template } = document;
	const docStyle = template?.document || {};

	return (
		<div className={cn("absolute inset-0 bg-neutral-100", className)}>
			<ScrollArea className="h-full w-full">
				<div
					className="flex min-w-max justify-center p-8 transition-transform duration-200"
					style={{
						transform: `scale(${scale / 100})`,
						transformOrigin: "top center",
						height: `calc(1056px * ${scale / 100})`,
					}}
				>
					<div
						className="shrink-0 rounded-none bg-white shadow-xl ring-1 ring-border"
						style={{
							width: "800px",
							fontFamily: docStyle.fontFamily?.body,
							fontSize: docStyle.fontSize?.body,
							lineHeight: docStyle.lineHeight,
							textAlign: docStyle.textAlign,
						}}
					>
						<div className="mx-auto min-h-[1056px] space-y-6 p-10 text-[11px] text-black leading-relaxed">
							<TitleCorePlugin document={document} target="print" />

							<article className="space-y-3 text-[11px] text-neutral-700">
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

							<ReferencesCorePlugin document={document} target="print" />
						</div>
					</div>
				</div>
			</ScrollArea>
		</div>
	);
}
