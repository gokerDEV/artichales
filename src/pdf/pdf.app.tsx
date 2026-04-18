import * as React from "react";
import { ArtichaleView } from "@/components/artichale/ArtichaleView";
import { parseArtichale } from "@/components/artichale/core/artichale.parser";
import { renderArtichale } from "@/components/artichale/core/artichale.render";
import type { ArtichaleExecutionResult } from "@/components/artichale/types/pipeline.types";
import { printJobRepository } from "@/services/print-job.repository";
import type { PrintJob } from "@/types/print-job";

function getJobIdFromLocation(): string | null {
	const params = new URLSearchParams(window.location.search);
	const raw = params.get("job");
	return raw && raw.trim().length > 0 ? raw : null;
}

export function PdfApp() {
	console.log("PdfApp");
	const [job, setJob] = React.useState<PrintJob | null>(null);
	const [executionResult, setExecutionResult] =
		React.useState<ArtichaleExecutionResult | null>(null);
	const [errorState, setErrorState] = React.useState<string | null>(null);

	React.useEffect(() => {
		const load = async () => {
			try {
				const jobId = getJobIdFromLocation();
				if (!jobId) return setErrorState("missing_job_id");

				const loaded = await printJobRepository.readPrintJobResult(jobId);
				if (!loaded.ok) return setErrorState(loaded.state);

				const markdown = {
					data: loaded.job.files["article.mda"] || "",
					lastModified: "",
				};
				const template = {
					data: loaded.job.files["template.json"] || "",
					lastModified: "",
				};
				const bibliography = {
					data: loaded.job.files["references.bib"] || "",
					lastModified: "",
				};

				const parsed = parseArtichale({
					markdown,
					template,
					bibliography,
				});

				const rendered = await renderArtichale({
					target: "print",
					lastModified: {
						markdown: markdown.lastModified,
						template: template.lastModified,
						bibliography: bibliography.lastModified,
					},
					template: parsed.template,
					bibliography: parsed.bibliography,
					frontmatter: parsed.frontmatter,
					ast: parsed.ast,
					headings: parsed.headings,
					labeledBlocks: parsed.labeledBlocks,
					citations: parsed.citations,
					plugins: parsed.plugins,
					fnJSONAssetReader: async (fileName) => {
						const content = loaded.job.files[fileName];
						return {
							data: content ? JSON.parse(content) : {},
							lastModified: "",
						};
					},
					fnAssetResolver: async (fileName) => ({
						fileName,
						resolvedSrc: loaded.job.files[fileName] || "",
						mimeType: "",
						lastModified: "",
					}),
				});

				setJob(loaded.job);
				setExecutionResult({ parse: parsed, render: rendered });
			} catch (err) {
				setErrorState("document_build_failed");
			}
		};
		void load();
	}, []);

	// Tell the background script to generate the PDF once Paged.js finishes
	const handleReadyToPrint = React.useCallback(() => {
		// Add a 1-second delay to let the browser physically render the DOM changes
		window.setTimeout(() => {
			chrome.runtime.sendMessage({
				type: "GENERATE_SILENT_PDF",
				filename: `artichale-export-${job?.id || "doc"}.pdf`,
			});
			if (job?.id) {
				void printJobRepository.deletePrintJob(job.id);
			}
		}, 1000);
	}, [job?.id]);
	if (errorState || !executionResult) return null;

	return (
		<main className="mx-auto min-h-screen w-full bg-white print:m-0 print:min-h-0 print:px-0 print:py-0">
			<ArtichaleView
				template={executionResult.parse.template}
				templateLastModified=""
				title={executionResult.render.title}
				authors={executionResult.render.authors}
				article={executionResult.render.article}
				references={executionResult.render.references}
				enablePaged={true}
				onReady={handleReadyToPrint}
			/>
		</main>
	);
}
