import sampleArticle from "@/workspace/defaults/article.mda?raw";
import sampleDatatable from "@/workspace/defaults/datatable_1.json?raw";
import samplePlot from "@/workspace/defaults/plot_1.json?raw";
import sampleReferences from "@/workspace/defaults/references.bib?raw";
import sampleTemplate from "@/workspace/defaults/template.json?raw";

export const DEFAULT_WORKSPACE_FILES: Record<string, string> = {
	"article.mda": sampleArticle,
	"references.bib": sampleReferences,
	"template.json": sampleTemplate,
	"plot_1.json": samplePlot,
	"datatable_1.json": sampleDatatable,
};
