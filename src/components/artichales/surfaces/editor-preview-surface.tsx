import { ArrowLeftToLine, ArrowRightToLine } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { MdxEditor } from "@/components/artichales/editor/mdx-editor";
import { FileTree } from "@/components/artichales/panels/file-tree";
import {
	PreviewHeader,
	type PreviewTarget,
} from "@/components/artichales/panels/preview-header";
import { CitationContext } from "@/components/artichales/plugins/citation.context";
import { PrintPreview } from "@/components/artichales/preview/print/print-preview";
import { WebPreview } from "@/components/artichales/preview/web/web-preview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDocument } from "@/hooks/use-document";
import { useSettings } from "@/hooks/use-settings";
import { useWorkspaceStore } from "@/store/workspace.store";
import {
	collectAlignmentHeadings,
	getHeadingIdForSourceOffset,
	getSourceOffsetForHeadingId,
} from "@/lib/alignment";
import {
	CORE_ARTICLE_FILE,
	isCoreWorkspaceFile,
	WORKSPACE_UI_STATE_KEY,
} from "@/lib/workspace";
import { DEFAULT_WORKSPACE_FILES } from "@/lib/workspace-default-files";
import { createZipFromWorkspaceFiles } from "@/lib/zip";
import {
	validateWorkspaceAsset,
	workspaceRepository,
} from "@/services/workspace.repository";

type WorkspaceUiState = {
	activeFile?: string;
	target?: PreviewTarget;
	scale?: number;
	panelSizes?: number[];
};

type UiDiagnostic = {
	severity: "error" | "warning" | "info";
	source: string;
	message: string;
	details?: string;
};

const FILE_TREE_PANEL_ID = "workspace-file-tree";
const EDITOR_PANEL_ID = "workspace-editor";
const PREVIEW_PANEL_ID = "workspace-preview";

function normalizePanelSizes(raw: unknown): number[] | null {
	if (!Array.isArray(raw) || raw.length !== 3) return null;
	const values = raw.map((value) =>
		typeof value === "number" && Number.isFinite(value) ? value : Number.NaN,
	);
	if (values.some((value) => Number.isNaN(value))) return null;
	const clamped = values.map((value) => Math.max(10, Math.min(80, value)));
	const sum = clamped.reduce((acc, value) => acc + value, 0);
	if (sum <= 0) return null;
	const normalized = clamped.map((value) => (value / sum) * 100);
	return normalized;
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

export function EditorPreviewSurface() {
	const [files, setFiles] = React.useState<Record<string, string>>(
		DEFAULT_WORKSPACE_FILES,
	);
	const [activeFile, setActiveFile] = React.useState(CORE_ARTICLE_FILE);
	const [target, setTarget] = React.useState<PreviewTarget>("print");
	const [scale, setScale] = React.useState(100);
	const [workspaceLoading, setWorkspaceLoading] = React.useState(true);
	const [saveError, setSaveError] = React.useState<string | null>(null);
	const [isDraggingAssets, setIsDraggingAssets] = React.useState(false);
	const [editorCursorOffset, setEditorCursorOffset] = React.useState(0);
	const [editorJumpRequest, setEditorJumpRequest] = React.useState<{
		offset: number;
		nonce: number;
	} | null>(null);
	const [panelSizesOverride, setPanelSizesOverride] = React.useState<
		number[] | null
	>(null);
	const pendingPdfExportRef = React.useRef(false);
	const assetInputRef = React.useRef<HTMLInputElement | null>(null);
	const previewShellRef = React.useRef<HTMLDivElement | null>(null);
	const hasLoadedWorkspaceRef = React.useRef(false);
	const isHydratingRef = React.useRef(true);
	const workerRef = React.useRef<Worker | null>(null);

	const { setRawFiles, setPipelineResult } = useWorkspaceStore();

	React.useEffect(() => {
		workerRef.current = new Worker(new URL("../../workers/pipeline.worker", import.meta.url), { type: "module" });
		
		workerRef.current.onmessage = (event) => {
			if (event.data.type === "PIPELINE_SUCCESS") {
				setPipelineResult(event.data.payload);
			} else if (event.data.type === "PIPELINE_ERROR") {
				console.error("[pipeline-worker] error:", event.data.error);
			}
		};

		return () => {
			workerRef.current?.terminate();
		};
	}, [setPipelineResult]);

	React.useEffect(() => {
		const timeout = setTimeout(() => {
			setRawFiles(files);
			if (workerRef.current) {
				useWorkspaceStore.setState({ isPipelineRunning: true });
				workerRef.current.postMessage({
					type: "EXECUTE_PIPELINE",
					files,
					target
				});
			}
		}, 300);
		return () => clearTimeout(timeout);
	}, [files, target, setRawFiles]);

	React.useEffect(() => {
		let cancelled = false;
		const loadWorkspace = async () => {
			try {
				const loaded = await workspaceRepository.loadWorkspace(
					DEFAULT_WORKSPACE_FILES,
				);
				if (cancelled) return;
				setFiles(loaded);

				try {
					const rawState = localStorage.getItem(WORKSPACE_UI_STATE_KEY);
					if (!rawState) return;
					const state = JSON.parse(rawState) as WorkspaceUiState;
					if (state.target === "web" || state.target === "print") {
						setTarget(state.target);
					}
					if (typeof state.scale === "number" && Number.isFinite(state.scale)) {
						setScale(Math.max(50, Math.min(200, Math.round(state.scale))));
					}
					const normalizedPanelSizes = normalizePanelSizes(state.panelSizes);
					if (normalizedPanelSizes) {
						setPanelSizesOverride(normalizedPanelSizes);
					}
					if (
						typeof state.activeFile === "string" &&
						Object.hasOwn(loaded, state.activeFile)
					) {
						setActiveFile(state.activeFile);
					}
				} catch {
					// Ignore malformed UI state and continue with defaults.
				}
			} finally {
				if (!cancelled) {
					hasLoadedWorkspaceRef.current = true;
					isHydratingRef.current = false;
					setWorkspaceLoading(false);
				}
			}
		};

		loadWorkspace();
		return () => {
			cancelled = true;
		};
	}, []);

	React.useEffect(() => {
		if (!hasLoadedWorkspaceRef.current || isHydratingRef.current) return;
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
		}, 500);
		return () => window.clearTimeout(timeout);
	}, [files]);

	React.useEffect(() => {
		if (!hasLoadedWorkspaceRef.current || isHydratingRef.current) return;
		try {
			const state: WorkspaceUiState = {
				activeFile,
				target,
				scale,
				panelSizes:
					panelSizesOverride && panelSizesOverride.length === 3
						? panelSizesOverride
						: undefined,
			};
			localStorage.setItem(WORKSPACE_UI_STATE_KEY, JSON.stringify(state));
		} catch {
			// Best-effort UI continuity state.
		}
	}, [activeFile, panelSizesOverride, target, scale]);

	const { settings, updateSettings, loading } = useSettings();
	const docSource = useDocument(files, target);
	const layoutTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	const handleFileChange = React.useCallback(
		(content: string) => {
			setFiles((prev) => ({ ...prev, [activeFile]: content }));
		},
		[activeFile],
	);
	const articleHeadings = React.useMemo(
		() => collectAlignmentHeadings(files[CORE_ARTICLE_FILE] || ""),
		[files],
	);

	const maxAssetFileSize = docSource.template.assetMaxFileSize;

	const addAssetsToWorkspace = React.useCallback(
		async (newFiles: FileList | File[]) => {
			const incoming = Array.from(newFiles);
			if (incoming.length === 0) return;

			let nextFiles = files;
			for (const file of incoming) {
				const validationError = validateWorkspaceAsset(
					file.name,
					file.size,
					maxAssetFileSize,
				);
				if (validationError) {
					toast.error(`${file.name}: ${validationError}`);
					continue;
				}
				if (isCoreWorkspaceFile(file.name)) {
					toast.error(
						`Cannot add or replace protected core file: ${file.name}`,
					);
					continue;
				}
				const content = await readAssetContent(file);
				nextFiles = { ...nextFiles, [file.name]: content };
			}

			if (nextFiles !== files) {
				setFiles(nextFiles);
				toast.success("Asset files were added to the workspace.");
			}
		},
		[files, maxAssetFileSize],
	);

	const handleAddAssetsClick = React.useCallback(() => {
		assetInputRef.current?.click();
	}, []);

	const handleAssetInputChange = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const selectedFiles = event.target.files;
			if (selectedFiles) {
				addAssetsToWorkspace(selectedFiles).catch((error) => {
					console.error(error);
					toast.error("Failed to add one or more assets.");
				});
			}
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
			if (files[proposed]) {
				toast.error("A file with this name already exists.");
				return;
			}
			const existingContent = files[fileName];
			if (typeof existingContent !== "string") return;
			const sizeInBytes = new Blob([existingContent]).size;
			const validationError = validateWorkspaceAsset(
				proposed,
				sizeInBytes,
				maxAssetFileSize,
			);
			if (validationError) {
				toast.error(`${proposed}: ${validationError}`);
				return;
			}

			setFiles((prev) => {
				const updated = { ...prev, [proposed]: existingContent };
				delete updated[fileName];
				return updated;
			});
			if (activeFile === fileName) {
				setActiveFile(proposed);
			}
		},
		[activeFile, files, maxAssetFileSize],
	);

	const handleDeleteAsset = React.useCallback(
		(fileName: string) => {
			if (isCoreWorkspaceFile(fileName)) return;
			const confirmed = window.confirm(`Delete asset "${fileName}"?`);
			if (!confirmed) return;
			setFiles((prev) => {
				const updated = { ...prev };
				delete updated[fileName];
				return updated;
			});
			if (activeFile === fileName) {
				setActiveFile(CORE_ARTICLE_FILE);
			}
		},
		[activeFile],
	);

	const savedSizes = normalizePanelSizes(panelSizesOverride) ||
		normalizePanelSizes(settings.ux?.editorPanelSizes) || [15, 40, 45];
	const defaultPanelLayout = React.useMemo(
		() => ({
			[FILE_TREE_PANEL_ID]: savedSizes[0] || 15,
			[EDITOR_PANEL_ID]: savedSizes[1] || 40,
			[PREVIEW_PANEL_ID]: savedSizes[2] || 45,
		}),
		[savedSizes],
	);

	const handleLayoutChanged = React.useCallback(
		(layout: Record<string, number>) => {
			const normalized = normalizePanelLayout(layout);
			if (!normalized) return;
			setPanelSizesOverride(normalized);
			if (layoutTimerRef.current) clearTimeout(layoutTimerRef.current);
			layoutTimerRef.current = setTimeout(() => {
				updateSettings({
					ux: { ...settings.ux, editorPanelSizes: normalized },
				});
			}, 300);
		},
		[settings.ux, updateSettings],
	);

	const blockingReason = docSource.blockingByFile[activeFile];
	const isFileSwitchLocked = typeof blockingReason === "string";
	const diagnostics = React.useMemo(() => {
		const entries: UiDiagnostic[] = [];
		for (const diag of docSource.templateDiagnostics) {
			entries.push({
				severity: diag.severity,
				source: "template",
				message: diag.message,
				details: diag.details,
			});
		}
		for (const diag of docSource.bibDiagnostics) {
			entries.push({
				severity: diag.severity,
				source: "bibliography",
				message: diag.message,
			});
		}
		for (const diag of docSource.assetDiagnostics) {
			entries.push({
				severity: diag.severity,
				source: `asset:${diag.fileName}`,
				message: diag.message,
			});
		}
		for (const diag of docSource.articleDiagnostics) {
			entries.push({
				severity: diag.severity,
				source: `article:${diag.source}`,
				message: diag.message,
			});
		}
		for (const diag of docSource.pipelineDiagnostics) {
			entries.push({
				severity: diag.severity,
				source: diag.stage ? `pipeline:${diag.stage}` : "pipeline",
				message: diag.message,
			});
		}
		if (saveError) {
			entries.push({
				severity: "error",
				source: "storage",
				message: saveError,
			});
		}
		return {
			errors: entries.filter((entry) => entry.severity === "error"),
			warnings: entries.filter((entry) => entry.severity === "warning"),
			info: entries.filter((entry) => entry.severity === "info"),
		};
	}, [
		docSource.templateDiagnostics,
		docSource.bibDiagnostics,
		docSource.assetDiagnostics,
		docSource.articleDiagnostics,
		docSource.pipelineDiagnostics,
		saveError,
	]);
	const hasDiagnostics =
		diagnostics.errors.length > 0 ||
		diagnostics.warnings.length > 0 ||
		diagnostics.info.length > 0;
	const diagnosticsInitialTab =
		diagnostics.errors.length > 0
			? "errors"
			: diagnostics.warnings.length > 0
				? "warnings"
				: "info";
	const editorCompletions = React.useMemo(
		() => ({
			bibKeys: Object.keys(docSource.citations),
			referenceSelectors: docSource.referenceTargets.map(
				(target) => target.selector,
			),
		}),
		[docSource.citations, docSource.referenceTargets],
	);

	const handleSelectFile = React.useCallback(
		(fileName: string) => {
			if (isFileSwitchLocked && fileName !== activeFile) return;
			setActiveFile(fileName);
		},
		[activeFile, isFileSwitchLocked],
	);

	const handleAlignSourceToPreview = React.useCallback(() => {
		if (activeFile !== CORE_ARTICLE_FILE) {
			setActiveFile(CORE_ARTICLE_FILE);
		}
		const headingId = getHeadingIdForSourceOffset(
			articleHeadings,
			editorCursorOffset,
		);
		if (!headingId) {
			toast.error("No mapped source heading found for alignment.");
			return;
		}
		const previewShell = previewShellRef.current;
		if (!previewShell) return;
		const headingElement = previewShell.querySelector<HTMLElement>(
			`[data-ac-heading-id="${headingId}"]`,
		);
		if (!headingElement) {
			toast.error("No mapped preview block found for current source heading.");
			return;
		}
		headingElement.scrollIntoView({ behavior: "smooth", block: "center" });
	}, [activeFile, articleHeadings, editorCursorOffset]);

	const handleAlignPreviewToSource = React.useCallback(() => {
		const previewShell = previewShellRef.current;
		if (!previewShell) return;
		const headingElements = Array.from(
			previewShell.querySelectorAll<HTMLElement>("[data-ac-heading-id]"),
		);
		if (headingElements.length === 0) {
			toast.error("No mapped preview heading found for alignment.");
			return;
		}

		const viewport = previewShell.querySelector<HTMLElement>(
			"[data-radix-scroll-area-viewport]",
		);
		const frame = viewport || previewShell;
		const frameRect = frame.getBoundingClientRect();
		const firstVisible =
			headingElements.find((element) => {
				const rect = element.getBoundingClientRect();
				return rect.bottom > frameRect.top + 8 && rect.top < frameRect.bottom;
			}) || headingElements[0];
		const headingId = firstVisible.dataset.acHeadingId;
		if (!headingId) return;

		const sourceOffset = getSourceOffsetForHeadingId(
			articleHeadings,
			headingId,
		);
		if (sourceOffset === null) {
			toast.error("No mapped source block found for current preview heading.");
			return;
		}
		setActiveFile(CORE_ARTICLE_FILE);
		setEditorJumpRequest({
			offset: sourceOffset,
			nonce: Date.now(),
		});
	}, [articleHeadings]);

	const runPdfExport = React.useCallback(() => {
		globalThis.document.body.setAttribute("data-artichales-printing", "true");
		window.setTimeout(() => {
			window.print();
		}, 60);
	}, []);

	const handleExportPdf = React.useCallback(() => {
		if (target === "print") {
			runPdfExport();
			return;
		}
		pendingPdfExportRef.current = true;
		setTarget("print");
	}, [target, runPdfExport]);

	const handleDownloadSource = React.useCallback(() => {
		try {
			const zipBlob = createZipFromWorkspaceFiles(files);
			const url = URL.createObjectURL(zipBlob);
			const anchor = globalThis.document.createElement("a");
			anchor.href = url;
			anchor.download = "source.zip";
			globalThis.document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error(error);
			toast.error("Failed to create source.zip");
		}
	}, [files]);

	const handleTreeDragOver = React.useCallback((event: React.DragEvent) => {
		event.preventDefault();
		setIsDraggingAssets(true);
	}, []);

	const handleTreeDragLeave = React.useCallback((event: React.DragEvent) => {
		if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
			setIsDraggingAssets(false);
		}
	}, []);

	const handleTreeDrop = React.useCallback(
		(event: React.DragEvent) => {
			event.preventDefault();
			setIsDraggingAssets(false);
			const droppedFiles = event.dataTransfer.files;
			if (!droppedFiles || droppedFiles.length === 0) return;
			addAssetsToWorkspace(droppedFiles).catch((error) => {
				console.error(error);
				toast.error("Failed to import dropped asset files.");
			});
		},
		[addAssetsToWorkspace],
	);

	React.useEffect(() => {
		const resetPrintState = () => {
			globalThis.document.body.removeAttribute("data-artichales-printing");
		};

		window.addEventListener("afterprint", resetPrintState);
		return () => {
			window.removeEventListener("afterprint", resetPrintState);
		};
	}, []);

	React.useEffect(() => {
		if (target !== "print" || !pendingPdfExportRef.current) return;
		pendingPdfExportRef.current = false;

		const timeout = window.setTimeout(() => {
			runPdfExport();
		}, 50);

		return () => window.clearTimeout(timeout);
	}, [target, runPdfExport]);

	if (loading || workspaceLoading) {
		return (
			<div className="flex h-full min-h-0 items-center justify-center text-muted-foreground text-sm">
				Loading workspace...
			</div>
		);
	}

	return (
		<CitationContext.Provider
			value={{
				entries: docSource.citations,
				validatedEntries: docSource.validatedBibEntries,
				style: docSource.citationStyle,
				citeClassName: docSource.template.utilities?.cite || "cite",
			}}
		>
			<div className="relative h-full min-h-0">
				<ResizablePanelGroup
					orientation="horizontal"
					className="h-full min-h-0 overflow-hidden"
					defaultLayout={defaultPanelLayout}
					onLayoutChanged={handleLayoutChanged}
				>
					<ResizablePanel
						id={FILE_TREE_PANEL_ID}
						defaultSize={savedSizes[0] || 15}
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
						{isFileSwitchLocked ? (
							<div className="mb-2 rounded-md border border-red-200 bg-red-50 p-2 text-red-700 text-xs">
								{blockingReason}
							</div>
						) : null}
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
								onClick={handleAddAssetsClick}
							>
								Add Asset
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
							<FileTree
								activeFile={activeFile}
								files={Object.keys(files)}
								onSelectFile={handleSelectFile}
								disableFileSwitch={isFileSwitchLocked}
								onRenameAsset={handleRenameAsset}
								onDeleteAsset={handleDeleteAsset}
							/>
						</section>
					</ResizablePanel>
					<ResizableHandle withHandle />
					<ResizablePanel
						id={EDITOR_PANEL_ID}
						defaultSize={savedSizes[1] || 40}
						minSize={25}
						className="flex min-h-0 flex-col overflow-hidden border-border border-r bg-muted/30"
					>
						<MdxEditor
							fileName={activeFile}
							value={files[activeFile] || ""}
							onChange={handleFileChange}
							onBlur={() => {
								workspaceRepository
									.saveWorkspace(files)
									.then(() => setSaveError(null))
									.catch((error) => {
										console.error("Failed to save workspace on blur:", error);
										setSaveError(
											"Failed to save workspace files. Your latest changes may not persist.",
										);
									});
							}}
							onCursorOffsetChange={(offset) => {
								if (activeFile === CORE_ARTICLE_FILE) {
									setEditorCursorOffset(offset);
								}
							}}
							jumpToOffset={editorJumpRequest?.offset ?? null}
							jumpToOffsetSignal={editorJumpRequest?.nonce ?? 0}
							label={activeFile}
							completions={editorCompletions}
						/>
					</ResizablePanel>
					<ResizableHandle withHandle className="z-10">
						<div className="pointer-events-none absolute -left-3 -mt-36 flex w-6 flex-col gap-2">
							<Button
								type="button"
								size="icon"
								variant="secondary"
								className="pointer-events-auto h-6 w-6"
								title="Source to preview alignment"
								aria-label="Source to preview alignment"
								onPointerDown={(event) => event.stopPropagation()}
								onClick={handleAlignSourceToPreview}
							>
								<ArrowRightToLine className="h-3.5 w-3.5" />
							</Button>
							<Button
								type="button"
								size="icon"
								variant="secondary"
								className="pointer-events-auto h-6 w-6"
								title="Preview to source alignment"
								aria-label="Preview to source alignment"
								onPointerDown={(event) => event.stopPropagation()}
								onClick={handleAlignPreviewToSource}
							>
								<ArrowLeftToLine className="h-3.5 w-3.5" />
							</Button>
						</div>
					</ResizableHandle>
					<ResizablePanel
						id={PREVIEW_PANEL_ID}
						defaultSize={savedSizes[2] || 45}
						minSize={30}
						className="flex min-h-0 flex-col overflow-hidden bg-muted/30"
					>
						<PreviewHeader
							target={target}
							onTargetChange={setTarget}
							scale={scale}
							onScaleChange={setScale}
							onExportPdf={handleExportPdf}
							onDownloadSource={handleDownloadSource}
						/>
						<div
							ref={previewShellRef}
							className="relative grow overflow-hidden"
						>
							{hasDiagnostics ? (
								<div className="border-border border-b bg-background p-2">
									<Tabs defaultValue={diagnosticsInitialTab}>
										<TabsList className="h-8">
											<TabsTrigger value="errors" className="px-2 text-xs">
												Errors ({diagnostics.errors.length})
											</TabsTrigger>
											<TabsTrigger value="warnings" className="px-2 text-xs">
												Warnings ({diagnostics.warnings.length})
											</TabsTrigger>
											<TabsTrigger value="info" className="px-2 text-xs">
												Info ({diagnostics.info.length})
											</TabsTrigger>
										</TabsList>
										<TabsContent
											value="errors"
											className="mt-2 max-h-28 overflow-auto"
										>
											{diagnostics.errors.length === 0 ? (
												<p className="px-1 text-muted-foreground text-xs">
													No errors.
												</p>
											) : (
												<ul className="space-y-1">
													{diagnostics.errors.map((diag, index) => (
														<li
															key={`error-${diag.source}-${diag.message}-${index}`}
															className="rounded border border-red-300 bg-red-50 px-2 py-1 text-red-700 text-xs"
														>
															[{diag.source}] {diag.message}
															{diag.details ? ` ${diag.details}` : ""}
														</li>
													))}
												</ul>
											)}
										</TabsContent>
										<TabsContent
											value="warnings"
											className="mt-2 max-h-28 overflow-auto"
										>
											{diagnostics.warnings.length === 0 ? (
												<p className="px-1 text-muted-foreground text-xs">
													No warnings.
												</p>
											) : (
												<ul className="space-y-1">
													{diagnostics.warnings.map((diag, index) => (
														<li
															key={`warning-${diag.source}-${diag.message}-${index}`}
															className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-amber-700 text-xs"
														>
															[{diag.source}] {diag.message}
															{diag.details ? ` ${diag.details}` : ""}
														</li>
													))}
												</ul>
											)}
										</TabsContent>
										<TabsContent
											value="info"
											className="mt-2 max-h-28 overflow-auto"
										>
											{diagnostics.info.length === 0 ? (
												<p className="px-1 text-muted-foreground text-xs">
													No info diagnostics.
												</p>
											) : (
												<ul className="space-y-1">
													{diagnostics.info.map((diag, index) => (
														<li
															key={`info-${diag.source}-${diag.message}-${index}`}
															className="rounded border border-sky-300 bg-sky-50 px-2 py-1 text-sky-700 text-xs"
														>
															[{diag.source}] {diag.message}
															{diag.details ? ` ${diag.details}` : ""}
														</li>
													))}
												</ul>
											)}
										</TabsContent>
									</Tabs>
								</div>
							) : null}
							{docSource.hasBlockingError ? (
								<div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground text-sm">
									Blocking diagnostics must be fixed before preview rendering
									can continue.
								</div>
							) : target === "web" ? (
								<WebPreview document={docSource} scale={scale} />
							) : (
								<PrintPreview document={docSource} scale={scale} />
							)}
						</div>
					</ResizablePanel>
				</ResizablePanelGroup>
			</div>
		</CitationContext.Provider>
	);
}
