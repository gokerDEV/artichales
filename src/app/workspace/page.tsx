"use client";

import { useEffect, useMemo, useState } from "react";
import { Edithor } from "@/components/edithor";
import { workspaceFileAdapter } from "@/lib/file.adapter";
import {
	CORE_ARTICLE_FILE,
	CORE_BIB_FILE,
	CORE_TEMPLATE_FILE,
} from "@/lib/workspace";
import { DEFAULT_WORKSPACE_FILES } from "@/lib/workspace-default-files";
import { workspaceRepository } from "@/services/workspace.repository";
import { useWorkspaceStore } from "@/store/workspace.store";
import { ExportPrintButton } from "./export-print.button";
// import { ExportPdfButton } from "./export-pdf.button";
import {
	type ViewerMode,
	ViewerModeSwitch,
	type ViewerTab,
} from "./viewer-mode-switch";
import { Viewers } from "./viewers";

export default function WorkspacePage() {
	const [mode, setMode] = useState<ViewerMode>("print");
	const [tab, setTab] = useState<ViewerTab>("viewer");
	const [isWorkspaceReady, setIsWorkspaceReady] = useState(false);

	const workspaceFiles = useWorkspaceStore((state) => state.workspaceFiles);
	const setRawFiles = useWorkspaceStore((state) => state.setRawFiles);

	useEffect(() => {
		let isMounted = true;

		const loadWorkspace = async () => {
			try {
				const workspace = await workspaceRepository.loadWorkspace(
					DEFAULT_WORKSPACE_FILES,
				);
				if (isMounted) {
					setRawFiles(workspace.files, workspace.lastModifiedByName);
					setIsWorkspaceReady(true);
				}
			} catch {
				if (isMounted) {
					setRawFiles({ ...DEFAULT_WORKSPACE_FILES });
					setIsWorkspaceReady(true);
				}
			}
		};

		loadWorkspace();

		return () => {
			isMounted = false;
		};
	}, [setRawFiles]);

	useEffect(() => {
		try {
			let stored = localStorage.getItem("artichale-viewer-mode-v1");
			if (stored === "web" || stored === "print") setMode(stored as ViewerMode);
			stored = localStorage.getItem("artichale-viewer-tab-v1");
			if (stored === "viewer" || stored === "diagnostics")
				setTab(stored as ViewerTab);
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
		const pinnedStaticFiles = new Set([
			CORE_TEMPLATE_FILE,
			CORE_ARTICLE_FILE,
			CORE_BIB_FILE,
		]);
		return workspaceFiles.map((f) => ({
			id: f.name,
			name: f.name,
			lastModified: f.lastUpdated,
			// Core files (article, template, bib) are not deletable
			deletable: !pinnedStaticFiles.has(f.name),
			editable: true,
			// Core files are pinned to the top
			pinned: pinnedStaticFiles.has(f.name),
		}));
	}, [workspaceFiles]);

	if (!isWorkspaceReady) {
		return (
			<div className="flex h-full min-h-0 w-full items-center justify-center text-sm text-muted-foreground">
				Preparing workspace...
			</div>
		);
	}

	return (
		<div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
			<Edithor
				open={CORE_ARTICLE_FILE}
				config={{
					maxFileSize: 5 * 1024 * 1024, // 5MB
					maxWorkspaceSize: 50 * 1024 * 1024, // 50MB
					maxFileCount: 20,
					validateFileName: (name) => {
						if (!name.endsWith(".json")) {
							console.log("Only .txt files are allowed");
							return false;
						}
						return true;
					},
				}}
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
						{/*<ExportPdfButton />*/}
					</div>
				}
				viewer={(props) => <Viewers {...props} mode={mode} tab={tab} />}
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
