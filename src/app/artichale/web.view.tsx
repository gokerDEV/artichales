import "@/components/artichale/base/base.template.web.css";
import { ArtichaleView } from "@/components/artichale/ArtichaleView";
import type { RenderArtichaleResult } from "@/components/artichale/types/render.types";
import type { TemplateResolved } from "@/components/artichale/types/template.types";

type WebViewProps = {
	template: TemplateResolved;
	result: RenderArtichaleResult;
};

export function WebView({ template, result }: WebViewProps) {
	return (
		<div>
			{result.title}
			{result.authors}
			{result.article}
			{result.references}
		</div>
	);
}
