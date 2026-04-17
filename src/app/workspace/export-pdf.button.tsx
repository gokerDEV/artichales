import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEdithorWorkspaceStore } from "@/components/edithor/stores/edithor-workspace.store";
import { printJobRepository } from "@/services/print-job.repository";

export function ExportPdfButton() {
	const [isExporting, setIsExporting] = useState(false);
	const files = useEdithorWorkspaceStore((state) => state.files);

	const handleExport = async () => {
		try {
			setIsExporting(true);

			const job = await printJobRepository.createPrintJob(files, {
				autoPrint: false, // We handle this explicitly now
			});

			// Open the PDF renderer in a background tab so it doesn't interrupt the user
			chrome.tabs.create({
				url: chrome.runtime.getURL(`pdf.html?job=${job.id}`),
				active: false, // CRITICAL: Keeps it hidden from the user
			});

			// Reset button state after a brief moment
			setTimeout(() => setIsExporting(false), 2000);
		} catch (error) {
			console.error("Failed to create print job:", error);
			setIsExporting(false);
		}
	};

	return (
		<Button
			type="button"
			onClick={handleExport}
			disabled={isExporting}
			variant="default"
			size="sm"
			className="h-7 px-3 text-xs flex-shrink-0"
		>
			<Download className="mr-1 h-3 w-3" />
			{isExporting ? "Exporting..." : "Export PDF"}
		</Button>
	);
}
