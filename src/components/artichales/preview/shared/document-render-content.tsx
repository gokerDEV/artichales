import { ReferencesCorePlugin } from "@/components/artichales/plugins/references.core.plugin";
import { TitleCorePlugin } from "@/components/artichales/plugins/title.core.plugin";
import type { DocumentSource } from "@/hooks/use-document";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "./markdown-content";

type RenderTarget = "web" | "print";

type DocumentRenderContentProps = {
	document: DocumentSource;
	target: RenderTarget;
	contentClassName?: string;
	articleClassName?: string;
};

export function DocumentRenderContent({
	document,
	target,
	contentClassName,
	articleClassName,
}: DocumentRenderContentProps) {
	return (
		<div id="artichales" className={cn(`artichales artichales--${target}`)}>
			<TitleCorePlugin document={document} target={target} />
			<article className={cn(contentClassName, articleClassName)}>
				<MarkdownContent
					content={document.content}
					plotFiles={document.plots}
					target={target}
				/>
			</article>
			<ReferencesCorePlugin document={document} target={target} />
		</div>
	);
}
