import ReactDOM from "react-dom/client";
import "@/style.css";
import { PdfApp } from "@/pdf/pdf.app";

const rootElement = document.getElementById("pdf-root");
if (rootElement) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(<PdfApp />);
}
