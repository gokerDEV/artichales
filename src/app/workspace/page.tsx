"use client";

import { useEffect, useState, useMemo } from "react";
import { ExportPrintButton } from "./export-print.button";
import { ExportPdfButton } from "./export-pdf.button";
import {
	type ViewerMode,
	ViewerModeSwitch,
	type ViewerTab,
} from "./viewer-mode-switch";
import { Viewers } from "./viewers";

import { Edithor } from "@/components/edithor";
import { workspaceFileAdapter } from "@/lib/file.adapter";
import { useWorkspaceStore } from "@/store/workspace.store";
import { getCoreFileNames } from "@/services/workspace.repository";

export default function WorkspacePage() {
	const [mode, setMode] = useState<ViewerMode>("print");
	const [tab, setTab] = useState<ViewerTab>("viewer");

	const workspaceFiles = useWorkspaceStore((state) => state.workspaceFiles);

	useEffect(() => {
		try {
			let stored = localStorage.getItem("artichale-viewer-mode-v1");
			if (stored === "web" || stored === "print") setMode(stored as ViewerMode);
			stored = localStorage.getItem("artichale-viewer-tab-v1");
			if (stored === "viewer" || stored === "diagnostics") setTab(stored as ViewerTab);
		} catch {
			// ignore storage errors
		}
	}, []);

	useEffect(() => {
		try {
			localStorage.setItem("artichale-viewer-mode-v1", mode);
		} catch {
			// ignore storage errors
		}
	}, [mode]);

	useEffect(() => {
		try {
			localStorage.setItem("artichale-viewer-tab-v1", tab);
		} catch {
			// ignore storage errors
		}
	}, [tab]);

	const files = useMemo(() => {
		const coreFiles = Object.values(getCoreFileNames());
		return workspaceFiles.map((f) => ({
			id: f.name,
			name: f.name,
			lastModified: f.lastUpdated,
			// Core files (article, template, bib) are not deletable
			deletable: !coreFiles.includes(f.name),
			editable: true,
			// Core files are pinned to the top
			pinned: coreFiles.includes(f.name),
		}));
	}, [workspaceFiles]);

	return (
		<div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
			<Edithor
				files={files}
				adapter={workspaceFileAdapter}
				previewHeaderExtras={
					<div className="flex items-center gap-2">
						<ViewerModeSwitch
							mode={mode}
							tab={tab}
							onModeChange={(nextMode) => {
								setMode(nextMode);
								setTab("viewer");
							}}
							onTabChange={setTab}
						/>
						<ExportPrintButton />
						<ExportPdfButton />
					</div>
				}
				previewContent={<Viewers mode={mode} tab={tab} />}
			/>
		</div>
	);
}

// import { ExportPrintButton } from "@/app/workspace/export-print.button.tsx";
// import { useEffect, useState } from "react";
// import { EdithorSurface } from "@/components/edithor";
// import {
// 	type ViewerMode,
// 	ViewerModeSwitch,
// 	type ViewerTab,
// } from "./viewer-mode-switch";
// import { Viewers } from "./viewers";
// import { ExportPdfButton } from "./export-pdf.button";
//
// export function WorkspacePage() {
// 	const [mode, setMode] = useState<ViewerMode>("print");
// 	const [tab, setTab] = useState<ViewerTab>("viewer");
//
// 	useEffect(() => {
// 		try {
// 			let stored = localStorage.getItem("artichale-viewer-mode-v1");
// 			if (stored === "web" || stored === "print") setMode(stored);
// 			stored = localStorage.getItem("artichale-viewer-tab-v1");
// 			if (stored === "viewer" || stored === "diagnostics") setTab(stored);
// 		} catch {
// 			// ignore storage errors
// 		}
// 	}, []);
//
// 	useEffect(() => {
// 		try {
// 			localStorage.setItem("artichale-viewer-mode-v1", mode);
// 		} catch {
// 			// ignore storage errors
// 		}
// 	}, [mode]);
//
// 	useEffect(() => {
// 		try {
// 			localStorage.setItem("artichale-viewer-tab-v1", tab);
// 		} catch {
// 			// ignore storage errors
// 		}
// 	}, [tab]);
//
// 	return (
// 		<div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
// 			<EdithorSurface
// 				previewHeaderExtras={
// 					<div className="flex items-center gap-2">
// 						<ViewerModeSwitch
// 							mode={mode}
// 							tab={tab}
// 							onModeChange={(nextMode) => {
// 								setMode(nextMode);
// 								setTab("viewer");
// 							}}
// 							onTabChange={setTab}
// 						/>
// 						<ExportPrintButton />
// 					</div>
// 				}
// 				viewer={(props) => <Viewers {...props} mode={mode} tab={tab} />}
// 			/>
// 		</div>
// 	);
// }


