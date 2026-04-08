import { DocumentRenderContent } from "@/components/artichales/preview/shared/document-render-content";
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
	const { template } = document;

	const isWeb = template?.target === "web";
	const Container = isWeb ? template.container || "article" : "article";

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
						<DocumentRenderContent
							document={document}
							target="web"
							contentClassName={cn(
								"prose-a:text-emerald-600 hover:prose-a:text-emerald-500",
								"prose-img:rounded-xl prose-img:border prose-img:border-border prose-img:shadow-sm",
								"prose-img:cursor-zoom-in",
								"prose-pre:border prose-pre:border-border",
								"prose-blockquote:border-emerald-500 prose-blockquote:border-l-4 prose-blockquote:bg-emerald-50/50 prose-blockquote:py-1 prose-blockquote:pr-4 dark:prose-blockquote:bg-emerald-950/20",
								"prose-headings:font-bold",
							)}
						/>
					</Container>
				</div>
			</ScrollArea>
		</div>
	);
}
