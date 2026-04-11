import { printJobRepository } from "@/services/print-job.repository";

function resolvePrintEntryUrl(jobId: string): string {
	const query = `job=${encodeURIComponent(jobId)}`;
	if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
		return `${chrome.runtime.getURL("print.html")}?${query}`;
	}
	const url = new URL("/print.html", window.location.href);
	url.search = query;
	return url.toString();
}

export async function launchPrintExport(
	files: Record<string, string>,
): Promise<void> {
	const job = await printJobRepository.createPrintJob(files, {
		autoPrint: true,
	});
	const printUrl = resolvePrintEntryUrl(job.id);
	const printWindow = window.open(printUrl, "_blank", "noopener,noreferrer");
	if (!printWindow) {
		throw new Error("Unable to open the print window. Please allow popups.");
	}
}
