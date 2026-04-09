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
import { Button } from "@/components/ui/button";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useDocument } from "@/hooks/use-document";
import { useSettings } from "@/hooks/use-settings";
import {
	CORE_ARTICLE_FILE,
	CORE_TEMPLATE_FILE,
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
};

function getAssetSizeLimitFromTemplate(
	files: Record<string, string>,
): number | undefined {
	try {
		const parsed = JSON.parse(files[CORE_TEMPLATE_FILE] || "{}") as {
			default?: { assets?: { maxFileSize?: number } };
		};
		const maxFileSize = parsed.default?.assets?.maxFileSize;
		return typeof maxFileSize === "number" && Number.isFinite(maxFileSize)
			? maxFileSize
			: undefined;
	} catch {
		return undefined;
	}
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

const TypedResizableGroup = ResizablePanelGroup as unknown as React.FC<
	React.ComponentProps<typeof ResizablePanelGroup> & {
		direction: "horizontal" | "vertical";
		onLayout?: (sizes: number[]) => void;
	}
>;

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
	const pendingPdfExportRef = React.useRef(false);
	const assetInputRef = React.useRef<HTMLInputElement | null>(null);
	const hasLoadedWorkspaceRef = React.useRef(false);
	const isHydratingRef = React.useRef(true);

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
		try {
			const state: WorkspaceUiState = { activeFile, target, scale };
			localStorage.setItem(WORKSPACE_UI_STATE_KEY, JSON.stringify(state));
		} catch {
			// Best-effort UI continuity state.
		}
	}, [activeFile, target, scale]);

	const { settings, updateSettings, loading } = useSettings();
	const layoutTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	const handleFileChange = (content: string) => {
		setFiles((prev) => ({ ...prev, [activeFile]: content }));
	};

	const maxAssetFileSize = React.useMemo(
		() => getAssetSizeLimitFromTemplate(files),
		[files],
	);

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

			setFiles((prev) => {
				const updated = { ...prev, [proposed]: existingContent };
				delete updated[fileName];
				return updated;
			});
			if (activeFile === fileName) {
				setActiveFile(proposed);
			}
		},
		[activeFile, files],
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

	const savedSizes = settings.ux?.editorPanelSizes || [15, 40, 45];
	const sizesRef = React.useRef<number[]>([...savedSizes]);

	const handleResize = React.useCallback(
		(index: number, size: unknown) => {
			if (typeof size !== "number") return;
			sizesRef.current[index] = size;
			if (layoutTimerRef.current) clearTimeout(layoutTimerRef.current);
			layoutTimerRef.current = setTimeout(() => {
				updateSettings({
					ux: { ...settings.ux, editorPanelSizes: [...sizesRef.current] },
				});
			}, 300);
		},
		[settings.ux, updateSettings],
	);

	const docSource = useDocument(files, target);
	const blockingReason = docSource.blockingByFile[activeFile];
	const isFileSwitchLocked = typeof blockingReason === "string";

	const handleSelectFile = React.useCallback(
		(fileName: string) => {
			if (isFileSwitchLocked && fileName !== activeFile) return;
			setActiveFile(fileName);
		},
		[activeFile, isFileSwitchLocked],
	);

	const runPdfExport = React.useCallback(() => {
		globalThis.document.body.setAttribute("data-artichales-printing", "true");
		window.requestAnimationFrame(() => {
			window.print();
		});
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
			<div className="flex h-[calc(100vh-4rem)] items-center justify-center text-muted-foreground text-sm">
				Loading workspace...
			</div>
		);
	}

	return (
		<CitationContext.Provider
			value={{
				entries: docSource.citations,
				style: docSource.citationStyle,
				citeClassName: docSource.template.utilities?.cite || "cite",
			}}
		>
			<TypedResizableGroup
				direction="horizontal"
				className="h-[calc(100vh-4rem)] overflow-hidden"
			>
				<ResizablePanel
					defaultSize={savedSizes[0] || 15}
					minSize={10}
					className="flex flex-col p-2"
					onResize={(size) => handleResize(0, size)}
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
								? "rounded-md border border-primary/50 border-dashed bg-primary/5"
								: "rounded-md border border-transparent"
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
					defaultSize={savedSizes[1] || 40}
					minSize={25}
					className="flex flex-col border-border border-r bg-muted/30"
					onResize={(size) => handleResize(1, size)}
				>
					<MdxEditor
						value={files[activeFile] || ""}
						onChange={handleFileChange}
						label={activeFile}
					/>
				</ResizablePanel>
				<ResizableHandle withHandle />
				<ResizablePanel
					defaultSize={savedSizes[2] || 45}
					minSize={30}
					className="flex flex-col bg-muted/30"
					onResize={(size) => handleResize(2, size)}
				>
					<PreviewHeader
						target={target}
						onTargetChange={setTarget}
						scale={scale}
						onScaleChange={setScale}
						onExportPdf={handleExportPdf}
						onDownloadSource={handleDownloadSource}
					/>
					<div className="relative grow overflow-hidden">
						{saveError ? (
							<div className="border-red-300 border-b bg-red-50 p-3 text-red-700 text-sm">
								{saveError}
							</div>
						) : null}
						{docSource.templateDiagnostics.length > 0 ? (
							<div
								className={`border-b p-3 text-sm ${docSource.hasTemplateError ? "border-red-300 bg-red-50 text-red-700" : "border-amber-300 bg-amber-50 text-amber-700"}`}
							>
								{docSource.templateDiagnostics.map((diag) => (
									<p key={`${diag.code}:${diag.message}`}>
										{diag.message}
										{diag.details ? ` ${diag.details}` : ""}
									</p>
								))}
							</div>
						) : null}
						{docSource.bibDiagnostics.length > 0 ? (
							<div className="border-red-300 border-b bg-red-50 p-3 text-red-700 text-sm">
								{docSource.bibDiagnostics.map((diag) => (
									<p key={`${diag.code}:${diag.message}`}>{diag.message}</p>
								))}
							</div>
						) : null}
						{docSource.articleDiagnostics.length > 0 ? (
							<div className="border-red-300 border-b bg-red-50 p-3 text-red-700 text-sm">
								{docSource.articleDiagnostics.map((diag) => (
									<p key={`${diag.code}:${diag.message}`}>{diag.message}</p>
								))}
							</div>
						) : null}
						{docSource.hasBlockingError ? (
							<div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground text-sm">
								Blocking diagnostics must be fixed before preview rendering can
								continue.
							</div>
						) : target === "web" ? (
							<WebPreview document={docSource} scale={scale} />
						) : (
							<PrintPreview document={docSource} scale={scale} />
						)}
					</div>
				</ResizablePanel>
			</TypedResizableGroup>
		</CitationContext.Provider>
	);
}
