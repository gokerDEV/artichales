/**
 * PDF Export Utilities for Artichales
 * Uses paged.js to generate print-ready PDF via browser print dialog
 */

export interface ExportPdfOptions {
	filename?: string;
	title?: string;
	author?: string;
}

/**
 * Export the paged print content as PDF
 * Opens the browser's print dialog so user can save as PDF
 */
export async function exportPagedContentAsPdf(
	element: HTMLElement | null,
	options: ExportPdfOptions = {},
): Promise<void> {
	if (!element) {
		throw new Error("No element to export");
	}

	const { filename = "document.pdf", title } = options;

	// Create a new window with the paged content
	const printWindow = window.open("", "_blank");
	if (!printWindow) {
		throw new Error(
			"Failed to open print window. Please check popup blocker settings.",
		);
	}

	try {
		// Copy the full HTML including styles
		const htmlContent = element.outerHTML;

		// Get all stylesheets from the document
		const stylesheets: string[] = [];
		for (const sheet of document.styleSheets) {
			try {
				// Try to read the href for external stylesheets
				if (sheet.href) {
					stylesheets.push(`<link rel="stylesheet" href="${sheet.href}" />`);
				}
			} catch {
				// Skip if we can't access the stylesheet
			}
		}

		// Write HTML to the print window
		const printHtml = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	${title ? `<title>${title}</title>` : `<title>${filename}</title>`}
	${stylesheets.join("\n")}
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		body {
			background-color: white;
			font-family: inherit;
		}
		.paged-print-content {
			background-color: white !important;
			padding: 0 !important;
			min-height: auto !important;
		}
		.pagedjs_page {
			background: white;
			box-shadow: 0 0 0.5cm rgba(0, 0, 0, 0.1);
			margin: 0.5cm;
		}
		@media print {
			body {
				margin: 0;
				padding: 0;
			}
			.paged-print-content {
				padding: 0 !important;
			}
			.pagedjs_page {
				margin: 0;
				box-shadow: none;
				page-break-after: always;
			}
		}
	</style>
</head>
<body>
	${htmlContent}
	<script>
		// Set document metadata if available
		${title ? `document.title = "${title.replace(/"/g, '\\"')}";` : ""}
		// Trigger print dialog
		window.addEventListener('load', () => {
			setTimeout(() => {
				window.print();
			}, 500);
		});
	</script>
</body>
</html>
`;

		printWindow.document.write(printHtml);
		printWindow.document.close();
	} catch (error) {
		printWindow.close();
		throw new Error(
			`Failed to export PDF: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Directly trigger browser print dialog for current document
 * Useful when the content is already in the DOM
 */
export function printCurrentDocument(): void {
	window.print();
}
