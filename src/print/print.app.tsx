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

export function PrintApp() {
	const [job, setJob] = React.useState<PrintJob | null>(null);
	const [executionResult, setExecutionResult] =
		React.useState<ArtichaleExecutionResult | null>(null);
	const [errorState, setErrorState] = React.useState<
		| null
		| "missing_job_id"
		| "not_found"
		| "expired"
		| "storage_unavailable"
		| "document_build_failed"
	>(null);
	const [isLoading, setIsLoading] = React.useState(true);

	React.useEffect(() => {
		let cancelled = false;
		const load = async () => {
			setIsLoading(true);
			setErrorState(null);
			try {
				const jobId = getJobIdFromLocation();
				if (!jobId || jobId.trim() === "") {
					setErrorState("missing_job_id");
					return;
				}

				const loaded = await printJobRepository.readPrintJobResult(jobId);
				if (!loaded.ok) {
					setErrorState(loaded.state);
					return;
				}

				try {
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

					// Parse the files from the job
					const parsed = parseArtichale({
						markdown,
						template,
						bibliography,
					});

					// Render the document
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
						// Mock asset readers if needed, or implement them to read from job.files
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

					if (cancelled) return;

					setJob(loaded.job);
					setExecutionResult({ parse: parsed, render: rendered });
				} catch (buildError) {
					console.error("Document build failed:", buildError);
					if (cancelled) return;
					setErrorState("document_build_failed");
				}
			} catch (err) {
				if (cancelled) return;
				console.error(err);
				setErrorState("storage_unavailable");
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		};

		void load();
		return () => {
			cancelled = true;
		};
	}, []);

	React.useEffect(() => {
		if (!job?.id) return;
		const cleanup = () => {
			void printJobRepository.deletePrintJob(job.id);
			window.setTimeout(() => {
				if (window.opener) {
					window.close();
				} else if (window.parent && window.parent !== window) {
					window.parent.postMessage(
						{ type: "PRINT_JOB_DONE", jobId: job.id },
						"*",
					);
				}
			}, 120);
		};
		window.addEventListener("afterprint", cleanup);
		return () => {
			window.removeEventListener("afterprint", cleanup);
		};
	}, [job?.id]);

	// Auto-print effect
	React.useEffect(() => {
		if (job?.options?.autoPrint && executionResult) {
			// Give Paged.js a moment to layout the pages
			const timer = window.setTimeout(() => {
				window.print();
			}, 1000);
			return () => clearTimeout(timer);
		}
	}, [job?.options?.autoPrint, executionResult]);

	if (isLoading) {
		return (
			<main className="flex min-h-screen items-center justify-center p-6 text-slate-600 text-sm">
				Preparing print document...
			</main>
		);
	}

	if (errorState || !executionResult) {
		const messageByState: Record<string, string> = {
			missing_job_id: "Missing print job id in URL.",
			not_found: "Print job was not found.",
			expired: "Print job expired before loading.",
			storage_unavailable:
				"Storage is unavailable. Unable to load the print job.",
			document_build_failed:
				"Failed to build the print document from the job snapshot.",
		};
		return (
			<main className="mx-auto min-h-screen max-w-2xl p-8">
				<div className="rounded border border-red-300 bg-red-50 p-4 text-red-700 text-sm">
					{errorState
						? messageByState[errorState]
						: "Print job failed to load."}
				</div>
			</main>
		);
	}

	return (
		<main className="mx-auto min-h-screen w-full bg-white px-4 py-6 print:m-0 print:min-h-0 print:px-0 print:py-0">
			<ArtichaleView
				template={executionResult.parse.template}
				title={executionResult.render.title}
				authors={executionResult.render.authors}
				article={executionResult.render.article}
				references={executionResult.render.references}
				enablePaged={true}
			/>
		</main>
	);
}
