import type { PrintPreviewProps } from "@/components/artichales/preview/print/print-preview";
import { PrintPreviewPane as PrintPreviewPaneImpl } from "@/components/artichales/preview/print/print-preview";

export function PrintPreviewPane(props: PrintPreviewProps) {
	return <PrintPreviewPaneImpl {...props} />;
}
