import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import * as React from "react";
import { toast } from "sonner";
import { EdithorEditor } from "@/components/edithor/editor/edithor-editor";
import { EdithorFileTree } from "@/components/edithor/panels/file-tree";
import { useEdithorUiStore } from "@/components/edithor/stores/edithor-ui.store";
import { useEdithorWorkspaceStore } from "@/components/edithor/stores/edithor-workspace.store";
import type {
	EdithorViewer,
	EdithorViewerMethods,
} from "@/components/edithor/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Switch } from "@/components/ui/switch";
import { isCoreWorkspaceFile } from "@/lib/workspace";
import { DEFAULT_WORKSPACE_FILES } from "@/lib/workspace-default-files";
import {
	validateWorkspaceAsset,
	workspaceRepository,
} from "@/services/workspace.repository";

type EdithorSurfaceProps = {
	viewer?: EdithorViewer;
	previewHeaderExtras?: React.ReactNode;
};

const EDITHOR_UI_STATE_KEY = "edithor-ui-state-v1";
const SAVE_DEBOUNCE_MS = 500;
const FILE_TREE_PANEL_ID = "edithor-file-tree";
const EDITOR_PANEL_ID = "edithor-editor";
const PREVIEW_PANEL_ID = "edithor-preview";

function normalizePanelSizes(raw: unknown): number[] | null {
	if (!Array.isArray(raw) || raw.length !== 3) return null;
	const values = raw.map((value) =>
		typeof value === "number" && Number.isFinite(value) ? value : Number.NaN,
	);
	if (values.some((value) => Number.isNaN(value))) return null;
	const clamped = values.map((value) => Math.max(10, Math.min(80, value)));
	const sum = clamped.reduce((acc, value) => acc + value, 0);
	if (sum <= 0) return null;
	return clamped.map((value) => Math.round((value / sum) * 1000) / 10);
}

function normalizePanelLayout(raw: unknown): number[] | null {
	if (typeof raw !== "object" || raw === null) return null;
	const layout = raw as Record<string, unknown>;
	return normalizePanelSizes([
		layout[FILE_TREE_PANEL_ID],
		layout[EDITOR_PANEL_ID],
		layout[PREVIEW_PANEL_ID],
	]);
}

function inferMimeType(fileName: string): string {
	const ext = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
	if (ext === ".svg") return "image/svg+xml";
	if (ext === ".png") return "image/png";
	if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
	if (ext === ".gif") return "image/gif";
	if (ext === ".json") return "application/json";
	return "text/plain";
}

function decodeDataUrlPayload(dataUrl: string): string | null {
	const match = dataUrl.match(
		/^data:([^;,]+)?(?:;charset=[^;,]+)?(;base64)?,(.*)$/s,
	);
	if (!match) return null;
	const isBase64 = Boolean(match[2]);
	const payload = match[3] ?? "";
	try {
		if (isBase64) return atob(payload);
		return decodeURIComponent(payload);
	} catch {
		return null;
	}
}

function resolveJsonCandidateNames(source: string): string[] {
	const raw = source.trim();
	if (!raw) return [];
	const normalized = raw.replace(/^\.?\//, "");
	const withoutExt = normalized.replace(/\.[^/.]+$/, "");
	const names = new Set<string>([
		raw,
		normalized,
		withoutExt,
		`${withoutExt}.json`,
	]);
	return [...names].filter(Boolean);
}

async function readAssetContent(file: File): Promise<string> {
	const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
	if (extension === ".json" || extension === ".svg") {
		return file.text();
	}
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () =>
			reject(new Error(`Unable to read file: ${file.name}`));
		reader.onload = () => resolve(String(reader.result || ""));
		reader.readAsDataURL(file);
	});
}

export function EdithorSurface({
	viewer,
	previewHeaderExtras,
}: EdithorSurfaceProps) {
	const files = useEdithorWorkspaceStore((state) => state.files);
	const activeFile = useEdithorWorkspaceStore((state) => state.activeFile);
	const loading = useEdithorWorkspaceStore((state) => state.loading);
	const saveError = useEdithorWorkspaceStore((state) => state.saveError);
	const setLoading = useEdithorWorkspaceStore((state) => state.setLoading);
	const setSaveError = useEdithorWorkspaceStore((state) => state.setSaveError);
	const hydrate = useEdithorWorkspaceStore((state) => state.hydrate);
	const setActiveFile = useEdithorWorkspaceStore(
		(state) => state.setActiveFile,
	);
	const updateActiveFileContent = useEdithorWorkspaceStore(
		(state) => state.updateActiveFileContent,
	);
	const addOrReplaceFile = useEdithorWorkspaceStore(
		(state) => state.addOrReplaceFile,
	);
	const renameAsset = useEdithorWorkspaceStore((state) => state.renameAsset);
	const deleteAsset = useEdithorWorkspaceStore((state) => state.deleteAsset);
	const resetWorkspace = useEdithorWorkspaceStore(
		(state) => state.resetWorkspace,
	);

	const panelSizes = useEdithorUiStore((state) => state.panelSizes);
	const isDraggingAssets = useEdithorUiStore((state) => state.isDraggingAssets);
	const isLivePreviewEnabled = useEdithorUiStore(
		(state) => state.isLivePreviewEnabled,
	);
	const setPanelSizes = useEdithorUiStore((state) => state.setPanelSizes);
	const setDraggingAssets = useEdithorUiStore(
		(state) => state.setDraggingAssets,
	);
	const setLivePreviewEnabled = useEdithorUiStore(
		(state) => state.setLivePreviewEnabled,
	);

	const assetInputRef = React.useRef<HTMLInputElement | null>(null);
	const filesRef = React.useRef(files);
	const loadedRef = React.useRef(false);

	// Keep ref synchronized during render so viewer methods never observe stale files on first paint.
	filesRef.current = files;

	React.useEffect(() => {
		let cancelled = false;
		const loadWorkspace = async () => {
			try {
				const loadedFiles = await workspaceRepository.loadWorkspace(
					DEFAULT_WORKSPACE_FILES,
				);
				if (cancelled) return;
				const mergedWithDefaults = {
					...DEFAULT_WORKSPACE_FILES,
					...loadedFiles,
				};
				hydrate(mergedWithDefaults);
				if (
					Object.keys(mergedWithDefaults).length !==
					Object.keys(loadedFiles).length
				) {
					void workspaceRepository.saveWorkspace(mergedWithDefaults);
				}

				try {
					const raw = localStorage.getItem(EDITHOR_UI_STATE_KEY);
					if (raw) {
						const parsed = JSON.parse(raw) as {
							activeFile?: string;
							panelSizes?: number[];
							isLivePreviewEnabled?: boolean;
						};
						if (
							typeof parsed.activeFile === "string" &&
							Object.hasOwn(mergedWithDefaults, parsed.activeFile)
						) {
							setActiveFile(parsed.activeFile);
						}
						const normalized = normalizePanelSizes(parsed.panelSizes);
						if (normalized) {
							setPanelSizes(normalized);
						}
						if (typeof parsed.isLivePreviewEnabled === "boolean") {
							setLivePreviewEnabled(parsed.isLivePreviewEnabled);
						}
					}
				} catch {
					// Ignore malformed UI state.
				}
			} finally {
				if (!cancelled) {
					loadedRef.current = true;
					setLoading(false);
				}
			}
		};

		loadWorkspace();
		return () => {
			cancelled = true;
		};
	}, [
		hydrate,
		setActiveFile,
		setLoading,
		setLivePreviewEnabled,
		setPanelSizes,
	]);

	React.useEffect(() => {
		if (!loadedRef.current) return;
		const timeout = window.setTimeout(() => {
			workspaceRepository
				.saveWorkspace(files)
				.then(() => setSaveError(null))
				.catch((error) => {
					console.error("Failed to save workspace:", error);
					setSaveError(
						"Failed to save workspace files. Your latest changes may not persist.",
					);
				});
		}, SAVE_DEBOUNCE_MS);
		return () => window.clearTimeout(timeout);
	}, [files, setSaveError]);

	React.useEffect(() => {
		if (!loadedRef.current) return;
		try {
			localStorage.setItem(
				EDITHOR_UI_STATE_KEY,
				JSON.stringify({ activeFile, panelSizes, isLivePreviewEnabled }),
			);
		} catch {
			// Ignore localStorage write failures.
		}
	}, [activeFile, isLivePreviewEnabled, panelSizes]);

	const addAssetsToWorkspace = React.useCallback(
		async (incomingFiles: FileList | File[]) => {
			const list = Array.from(incomingFiles);
			if (list.length === 0) return;

			let changed = false;
			for (const file of list) {
				if (isCoreWorkspaceFile(file.name)) {
					toast.error(
						`Cannot add or replace protected core file: ${file.name}`,
					);
					continue;
				}
				const validationError = validateWorkspaceAsset(file.name, file.size);
				if (validationError) {
					toast.error(`${file.name}: ${validationError}`);
					continue;
				}
				const content = await readAssetContent(file);
				addOrReplaceFile(file.name, content);
				changed = true;
			}

			if (changed) {
				toast.success("Assets added to workspace.");
			}
		},
		[addOrReplaceFile],
	);

	const handleAssetInputChange = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const selected = event.target.files;
			if (!selected) return;
			addAssetsToWorkspace(selected).catch((error) => {
				console.error(error);
				toast.error("Failed to add one or more assets.");
			});
			event.target.value = "";
		},
		[addAssetsToWorkspace],
	);

	const handleRenameAsset = React.useCallback(
		(fileName: string) => {
			if (isCoreWorkspaceFile(fileName)) return;
			const proposed = window.prompt("Rename asset file", fileName);
			if (!proposed || proposed === fileName) return;
			if (isCoreWorkspaceFile(proposed)) {
				toast.error("Cannot rename an asset to a protected core filename.");
				return;
			}
			const content = filesRef.current[fileName];
			if (!content) return;
			const sizeInBytes = new Blob([content]).size;
			const validationError = validateWorkspaceAsset(proposed, sizeInBytes);
			if (validationError) {
				toast.error(`${proposed}: ${validationError}`);
				return;
			}
			const success = renameAsset(fileName, proposed);
			if (!success) {
				toast.error("Could not rename file.");
			}
		},
		[renameAsset],
	);

	const handleDeleteAsset = React.useCallback(
		(fileName: string) => {
			if (isCoreWorkspaceFile(fileName)) return;
			const confirmed = window.confirm(`Delete asset "${fileName}"?`);
			if (!confirmed) return;
			deleteAsset(fileName);
		},
		[deleteAsset],
	);

	const handleResetWorkspace = React.useCallback(() => {
		const confirmed = window.confirm(
			"Reset workspace to default files? This will discard current edits.",
		);
		if (!confirmed) return;
		resetWorkspace({ ...DEFAULT_WORKSPACE_FILES });
		toast.success("Workspace reset to defaults.");
	}, [resetWorkspace]);

	const handleLayoutChanged = React.useCallback(
		(layout: Record<string, number>) => {
			const normalized = normalizePanelLayout(layout);
			if (normalized) {
				setPanelSizes(normalized);
			}
		},
		[setPanelSizes],
	);

	const defaultPanelLayout = React.useMemo(
		() => ({
			[FILE_TREE_PANEL_ID]: panelSizes[0] ?? 16,
			[EDITOR_PANEL_ID]: panelSizes[1] ?? 44,
			[PREVIEW_PANEL_ID]: panelSizes[2] ?? 40,
		}),
		[panelSizes],
	);

	const handleTreeDragOver = React.useCallback(
		(event: React.DragEvent) => {
			event.preventDefault();
			setDraggingAssets(true);
		},
		[setDraggingAssets],
	);

	const handleTreeDragLeave = React.useCallback(
		(event: React.DragEvent) => {
			if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
				setDraggingAssets(false);
			}
		},
		[setDraggingAssets],
	);

	const handleTreeDrop = React.useCallback(
		(event: React.DragEvent) => {
			event.preventDefault();
			setDraggingAssets(false);
			const dropped = event.dataTransfer.files;
			if (!dropped || dropped.length === 0) return;
			addAssetsToWorkspace(dropped).catch((error) => {
				console.error(error);
				toast.error("Failed to import dropped asset files.");
			});
		},
		[addAssetsToWorkspace, setDraggingAssets],
	);

	const viewerMethods = React.useMemo<EdithorViewerMethods>(
		() => ({
			listFiles: () => Object.keys(filesRef.current),
			listAssetFiles: () =>
				Object.keys(filesRef.current).filter(
					(name) => !isCoreWorkspaceFile(name),
				),
			readFile: (fileName) => filesRef.current[fileName] ?? null,
			readAssetText: (fileName) =>
				isCoreWorkspaceFile(fileName)
					? null
					: (filesRef.current[fileName] ?? null),
			readAssetDataUrl: (fileName) => {
				if (isCoreWorkspaceFile(fileName)) return null;
				const content = filesRef.current[fileName];
				if (!content) return null;
				if (content.startsWith("data:")) return content;
				const mime = inferMimeType(fileName);
				return `data:${mime};charset=utf-8,${encodeURIComponent(content)}`;
			},
			readJsonAsset: <T,>(fileName: string) => {
				const files = filesRef.current;
				const lowerToActual = new Map(
					Object.keys(files).map((name) => [name.toLowerCase(), name] as const),
				);
				const candidates = resolveJsonCandidateNames(fileName);
				const queue: string[] = [];
				const seen = new Set<string>();

				for (const candidate of candidates) {
					if (!seen.has(candidate)) {
						queue.push(candidate);
						seen.add(candidate);
					}
					const caseResolved = lowerToActual.get(candidate.toLowerCase());
					if (caseResolved && !seen.has(caseResolved)) {
						queue.push(caseResolved);
						seen.add(caseResolved);
					}
				}

				for (const candidate of queue) {
					const raw = files[candidate];
					if (typeof raw !== "string") continue;
					const decoded = raw.startsWith("data:")
						? (decodeDataUrlPayload(raw) ?? raw)
						: raw;
					try {
						return {
							data: JSON.parse(decoded.replace(/^\uFEFF/, "").trim()) as T,
							resolvedFileName: candidate,
						};
					} catch {}
				}
				return null;
			},
		}),
		[],
	);

	if (loading) {
		return (
			<div className="flex h-full min-h-0 items-center justify-center text-muted-foreground text-sm">
				Loading workspace...
			</div>
		);
	}

	return (
		<div className="relative h-full min-h-0">
			<ResizablePanelGroup
				orientation="horizontal"
				className="h-full min-h-0 overflow-hidden"
				defaultLayout={defaultPanelLayout}
				onLayoutChanged={handleLayoutChanged}
			>
				<ResizablePanel
					id={FILE_TREE_PANEL_ID}
					defaultSize={panelSizes[0] ?? 16}
					minSize={10}
					className="flex min-h-0 flex-col overflow-hidden p-2"
				>
					<input
						ref={assetInputRef}
						type="file"
						multiple
						accept=".json,.svg,.png,.jpg,.jpeg,.gif"
						className="hidden"
						onChange={handleAssetInputChange}
					/>
					{saveError ? (
						<Alert variant="destructive" className="mb-2">
							<AlertTitle>Save failed</AlertTitle>
							<AlertDescription>{saveError}</AlertDescription>
						</Alert>
					) : null}
					<div className="mb-2 flex items-center gap-2">
						<Button
							type="button"
							size="sm"
							variant="outline"
							className="h-7 px-2 text-xs"
							onClick={() => assetInputRef.current?.click()}
						>
							Add Asset
						</Button>
						<Button
							type="button"
							size="sm"
							variant="outline"
							className="h-7 px-2 text-xs"
							onClick={handleResetWorkspace}
						>
							Reset
						</Button>
						<span className="text-[11px] text-muted-foreground">
							Drop files here
						</span>
					</div>
					<section
						aria-label="Workspace assets drop zone"
						className={
							isDraggingAssets
								? "min-h-0 flex-1 overflow-y-auto rounded-md border border-primary/50 border-dashed bg-primary/5"
								: "min-h-0 flex-1 overflow-y-auto rounded-md border border-transparent"
						}
						onDragOver={handleTreeDragOver}
						onDragLeave={handleTreeDragLeave}
						onDrop={handleTreeDrop}
					>
						<EdithorFileTree
							activeFile={activeFile}
							files={Object.keys(files)}
							onSelectFile={setActiveFile}
							onRenameAsset={handleRenameAsset}
							onDeleteAsset={handleDeleteAsset}
						/>
					</section>
				</ResizablePanel>
				<ResizableHandle withHandle />
				<ResizablePanel
					id={EDITOR_PANEL_ID}
					defaultSize={panelSizes[1] ?? 44}
					minSize={25}
					className="flex min-h-0 flex-col overflow-hidden border-border border-r bg-muted/30"
				>
					<div className="flex h-12 shrink-0 items-center justify-between border-border border-b bg-card px-4">
						<div className="truncate font-medium text-muted-foreground text-xs">
							{activeFile}
						</div>
						<div className="flex items-center gap-2 text-muted-foreground text-xs">
							Live Preview
							<Switch
								size="sm"
								checked={isLivePreviewEnabled}
								onCheckedChange={(checked) =>
									setLivePreviewEnabled(Boolean(checked))
								}
								aria-label="Live preview toggle"
							/>
						</div>
					</div>
					<ScrollArea className="flex-1 min-h-0">
						<EdithorEditor
							fileName={activeFile}
							value={files[activeFile] || ""}
							onChange={updateActiveFileContent}
							onBlur={() => {
								workspaceRepository
									.saveWorkspace(filesRef.current)
									.then(() => setSaveError(null))
									.catch((error) => {
										console.error("Failed to save workspace on blur:", error);
										setSaveError(
											"Failed to save workspace files. Your latest changes may not persist.",
										);
									});
							}}
							label={activeFile}
						/>
					</ScrollArea>
				</ResizablePanel>
				<ResizableHandle withHandle />
				<ResizablePanel
					id={PREVIEW_PANEL_ID}
					defaultSize={panelSizes[2] ?? 40}
					minSize={25}
					className="flex min-h-0 flex-col !overflow-hidden bg-muted/30"
				>
					<div className="flex h-12 shrink-0 items-center justify-between border-border border-b bg-card px-4">
						<div className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Preview
						</div>
						{previewHeaderExtras ? (
							<div className="flex items-center gap-2">
								{previewHeaderExtras}
							</div>
						) : null}
					</div>
					<ScrollArea className="flex-1 min-h-0">
						{viewer ? (
							viewer({
								files,
								activeFile,
								methods: viewerMethods,
							})
						) : (
							<div className="flex h-full min-h-[200px] items-center justify-center rounded-md border border-border border-dashed bg-background text-muted-foreground text-sm">
								No viewer attached. Pass a `viewer` method to `EdithorSurface`.
							</div>
						)}
					</ScrollArea>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}
