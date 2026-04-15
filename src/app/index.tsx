import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router-dom";
import Layout from "@/components/common/app.layout";
import { ArtichalePage } from "./artichale/page";
import { EditorPage } from "./editor/page";
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
						<Route path="/" element={<EditorPage />} />
						<Route path="/editor" element={<EditorPage />} />
						<Route path="/artichale" element={<ArtichalePage />} />
						<Route path="/settings" element={<SettingsPage />} />
					</Route>
				</Routes>
			</HashRouter>
		</React.StrictMode>,
	);
}
