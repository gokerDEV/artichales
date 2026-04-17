import "@/components/artichale/base/base.template.web.css";
import type { RenderArtichaleResult } from "@/components/artichale/types/render.types";
import type { TemplateResolved } from "@/components/artichale/types/template.types";

type WebViewProps = {
	template: TemplateResolved;
	result: RenderArtichaleResult;
};

export function WebView({ result }: WebViewProps) {
	return (
		<div>
			{result.title}
			{result.authors}
			{result.article}
			{result.references}
		</div>
	);
}
