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
	const [error, setError] = React.useState<string | null>(null);
	const [isLoading, setIsLoading] = React.useState(true);

	React.useEffect(() => {
		let cancelled = false;
		const load = async () => {
			setIsLoading(true);
			setError(null);
			try {
				const jobId = getJobIdFromLocation();
				if (!jobId) {
					throw new Error("Print job id is missing.");
				}
				const loadedJob = await printJobRepository.readPrintJob(jobId);
				if (!loadedJob) {
					throw new Error("Print job was not found or has expired.");
				}
				const model = buildDocumentModel(loadedJob.files);
				const result = enrichDocumentModelForTarget(model, "print");
				const nextDocument = buildDocumentSource(result);
				if (cancelled) return;
				setJob(loadedJob);
				setDocumentSource(nextDocument);
			} catch (err) {
				if (cancelled) return;
				const message =
					err instanceof Error ? err.message : "Failed to load print job.";
				setError(message);
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

	if (error || !documentSource) {
		return (
			<main className="mx-auto min-h-screen max-w-2xl p-8">
				<div className="rounded border border-red-300 bg-red-50 p-4 text-red-700 text-sm">
					{error || "Print job failed to load."}
				</div>
			</main>
		);
	}

	return (
		<main className="mx-auto min-h-screen w-full bg-white px-4 py-6">
			<PrintDocumentRenderer
				document={documentSource}
				onReadyToPrint={handleReadyToPrint}
			/>
		</main>
	);
}
