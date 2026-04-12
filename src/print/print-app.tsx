import * as React from "react";
import { PrintDocumentRenderer } from "@/components/artichales/preview/print/print-document-renderer";
import {
	type DocumentSource,
	resolveTemplateForTarget,
} from "@/hooks/use-document";
import {
	buildDocumentModel,
	enrichDocumentModelForTarget,
	type PipelineResult,
} from "@/lib/document-pipeline";
import { printJobRepository } from "@/services/print-job.repository";
import type { PrintJob } from "@/types/print-job";

function buildDocumentSource(result: PipelineResult): DocumentSource {
	const resolvedTemplate = resolveTemplateForTarget(result.template, "print");
	const allDiagnostics = [
		...result.templateDiagnostics,
		...result.bibDiagnostics,
		...result.assetDiagnostics,
		...result.articleDiagnostics,
		...result.pipelineDiagnostics,
	];

	return {
		ast: result.ast,
		content: result.content,
		frontmatter: result.frontmatter,
		citations: result.citations,
		validatedBibEntries: result.validatedBibEntries,
		plots: result.plots,
		template: resolvedTemplate,
		citationStyle: resolvedTemplate.citationStyle ?? "numeric",
		assetFiles: [],
		templateDiagnostics: result.templateDiagnostics,
		bibDiagnostics: result.bibDiagnostics,
		assetDiagnostics: result.assetDiagnostics,
		articleDiagnostics: result.articleDiagnostics,
		resolvedReferences: result.resolvedReferences,
		captions: result.captions,
		referenceTargets: result.referenceTargets,
		activePluginIds: result.activePluginIds,
		pipelineDiagnostics: result.pipelineDiagnostics,
		blockingByFile: {},
		isBlockingActiveFile: () => false,
		hasTemplateError: allDiagnostics.some(
			(diag) => diag.severity === "error" && diag.code.startsWith("template-"),
		),
		hasBlockingError: allDiagnostics.some((diag) => diag.severity === "error"),
	};
}

function getJobIdFromLocation(): string | null {
	const params = new URLSearchParams(window.location.search);
	const raw = params.get("job");
	return raw && raw.trim().length > 0 ? raw : null;
}

export function PrintApp() {
	const [job, setJob] = React.useState<PrintJob | null>(null);
	const [documentSource, setDocumentSource] =
		React.useState<DocumentSource | null>(null);
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
				let nextDocument: DocumentSource;
				try {
					const model = buildDocumentModel(loaded.job.files);
					const result = enrichDocumentModelForTarget(model, "print");
					nextDocument = buildDocumentSource(result);
				} catch {
					setErrorState("document_build_failed");
					return;
				}
				if (cancelled) return;
				setJob(loaded.job);
				setDocumentSource(nextDocument);
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
				}
			}, 120);
		};
		window.addEventListener("afterprint", cleanup);
		return () => {
			window.removeEventListener("afterprint", cleanup);
		};
	}, [job?.id]);

	const handleReadyToPrint = React.useCallback(() => {
		if (!job?.options?.autoPrint) return;
		window.setTimeout(() => {
			window.print();
		}, 80);
	}, [job?.options?.autoPrint]);

	if (isLoading) {
		return (
			<main className="flex min-h-screen items-center justify-center p-6 text-slate-600 text-sm">
				Preparing print document...
			</main>
		);
	}

	if (errorState || !documentSource) {
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
			<PrintDocumentRenderer
				document={documentSource}
				onReadyToPrint={handleReadyToPrint}
			/>
		</main>
	);
}
