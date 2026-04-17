import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router-dom";
import Layout from "@/components/common/app.layout";
import WorkspacePage from "./workspace/page";
import "@/style.css";
import { SettingsPage } from "./settings/page";

const rootElement = document.getElementById("root");

if (rootElement) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<React.StrictMode>
			<HashRouter>
				<Routes>
					<Route element={<Layout />}>
						<Route path="/" element={<WorkspacePage />} />
						<Route path="/settings" element={<SettingsPage />} />
					</Route>
				</Routes>
			</HashRouter>
		</React.StrictMode>,
	);
}
