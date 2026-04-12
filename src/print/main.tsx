import ReactDOM from "react-dom/client";
import "@/style.css";
import { PrintApp } from "@/print/print-app";

const rootElement = document.getElementById("print-root");

if (rootElement) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(<PrintApp />);
}
