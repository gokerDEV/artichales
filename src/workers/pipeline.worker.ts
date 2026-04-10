import { runDocumentPipeline } from "@/lib/document-pipeline";

self.onmessage = async (event: MessageEvent) => {
	if (event.data.type === "EXECUTE_PIPELINE") {
		try {
			const result = runDocumentPipeline(event.data.files, event.data.target);
			self.postMessage({
				type: "PIPELINE_SUCCESS",
				payload: {
					ast: result.ast, // make sure runDocumentPipeline produces an AST instead of/in addition to raw html!
					frontmatter: result.frontmatter,
					citations: result.citations,
					validatedBibEntries: result.validatedBibEntries,
					plots: result.plots,
					template: result.template,
					citationStyle: result.template?.default?.citationStyle || "numeric",
					referenceRegistry: result.resolvedReferences,
					diagnostics: [
						...result.templateDiagnostics,
						...result.bibDiagnostics,
						...result.assetDiagnostics,
						...result.articleDiagnostics,
						...result.pipelineDiagnostics,
					],
					activePluginIds: result.activePluginIds,
				},
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			self.postMessage({
				type: "PIPELINE_ERROR",
				error: errorMessage,
			});
		}
	}
};



