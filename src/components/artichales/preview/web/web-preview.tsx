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
	const webLayout = template?.webLayout || {};
	const containerWidth = webLayout.containerWidth || "800px";
	const containerClass =
		webLayout.containerClass ||
		"shrink-0 rounded-xl border border-border bg-card shadow-sm";
	const containerPaddingClass =
		webLayout.containerPaddingClass || "p-12 md:p-16";
	const contentClass = webLayout.contentClass || "max-w-none";

	return (
		<div className={cn("absolute inset-0 bg-background", className)}>
			<ScrollArea className="h-full w-full">
				<div
					className="flex w-full justify-center p-4"
					style={{
						transform: `scale(${scale / 100})`,
						transformOrigin: "top center",
						paddingBottom: `calc(40vh * ${scale / 100})`,
					}}
				>
					<Container
						data-art-preview-render-root="true"
						className={cn("w-full", containerClass, containerPaddingClass)}
						style={{ maxWidth: containerWidth }}
					>
						<DocumentRenderContent
							document={document}
							target="web"
							contentClassName={cn(contentClass)}
						/>
					</Container>
				</div>
			</ScrollArea>
		</div>
	);
}
