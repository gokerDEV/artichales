import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { printJobRepository } from "@/services/print-job.repository";
import { useWorkspaceStore } from "@/store/workspace.store";

export function ExportPrintButton() {
	const [isExporting, setIsExporting] = useState(false);
	const [activeJobId, setActiveJobId] = useState<string | null>(null);
	const files = useWorkspaceStore((state) => state.rawFiles);

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (event.data?.type === "PRINT_JOB_DONE") {
				setActiveJobId(null);
				setIsExporting(false);
			}
		};
		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, []);

	const handleExport = async () => {
		try {
			setIsExporting(true);
			const job = await printJobRepository.createPrintJob(files, {
				autoPrint: true,
			});
			setActiveJobId(job.id);
		} catch (error) {
			console.error("Failed to create print job:", error);
			setIsExporting(false);
		}
	};

	return (
		<>
			<Button
				type="button"
				onClick={handleExport}
				disabled={isExporting}
				variant="default"
				size="sm"
				className="h-7 px-3 text-xs shrink-0"
			>
				<Download className="mr-1 h-3 w-3" />
				{isExporting ? "Preparing..." : "Export PDF"}
			</Button>
			{activeJobId && (
				<iframe
					src={`/print.html?job=${activeJobId}`}
					title="PDF Export Worker"
					className="absolute -left-[9999px] -top-[9999px] h-0 w-0 opacity-0 pointer-events-none shadow-none border-0"
				/>
			)}
		</>
	);
}
