import React from "react";
import ReactDOM from "react-dom/client";
import { Sidepanel } from "./Sidepanel";
import "@/style.css";

// Side panel entry point — mounts the root app directly.
const rootElement = document.getElementById("root");
if (rootElement) {
	ReactDOM.createRoot(rootElement).render(
		<React.StrictMode>
			<Sidepanel />
		</React.StrictMode>,
	);
}
