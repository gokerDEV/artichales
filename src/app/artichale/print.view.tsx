import { ArtichaleView } from "@/components/artichale/ArtichaleView";
import type { RenderArtichaleResult } from "@/components/artichale/types/render.types";
import type { TemplateResolved } from "@/components/artichale/types/template.types";

type PrintViewProps = {
	template: TemplateResolved;
	result: RenderArtichaleResult;
};

export function PrintView({ template, result }: PrintViewProps) {
	return (
		<ArtichaleView
			template={template}
			title={result.title}
			authors={result.authors}
			article={result.article}
			references={result.references}
			enablePaged
		/>
	);
}
