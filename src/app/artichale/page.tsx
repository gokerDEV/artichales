import { useEffect, useState } from "react";
import { EdithorSurface } from "@/components/edithor";
import {
	type ViewerMode,
	ViewerModeSwitch,
	type ViewerTab,
} from "./viewer-mode-switch";
import { Viewers } from "./viewers";

export function ArtichalePage() {
	const [mode, setMode] = useState<ViewerMode>("web");
	const [tab, setTab] = useState<ViewerTab>("viewer");

	useEffect(() => {
		try {
			const stored = localStorage.getItem("artichale-viewer-mode-v1");
			if (stored === "web" || stored === "print") setMode(stored);
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
			const stored = localStorage.getItem("artichale-viewer-tab-v1");
			if (stored === "viewer" || stored === "diagnostics") setTab(stored);
		} catch {
			// ignore storage errors
		}
	}, []);

	useEffect(() => {
		try {
			localStorage.setItem("artichale-viewer-tab-v1", tab);
		} catch {
			// ignore storage errors
		}
	}, [tab]);

	return (
		<div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
			<EdithorSurface
				previewHeaderExtras={
					<ViewerModeSwitch
						mode={mode}
						tab={tab}
						onModeChange={(nextMode) => {
							setMode(nextMode);
							setTab("viewer");
						}}
						onTabChange={setTab}
					/>
				}
				viewer={(props) => <Viewers {...props} mode={mode} tab={tab} />}
			/>
		</div>
	);
}
