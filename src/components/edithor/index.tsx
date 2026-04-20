// export { EdithorSurface } from "@/components/edithor/surfaces/edithor-surface";
// export type {
// 	EdithorViewer,
// 	EdithorViewerMethods,
// 	EdithorViewerProps,
// } from "@/components/edithor/types";

import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorView } from "@codemirror/view";
import { Button } from "@/components/ui/button";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEdithor } from "@/hooks/use-edithor";
import { EdithorEditor } from "./editor";
import { FileTree } from "./file-tree";
import { useEdithorUiStore } from "./stores/edithor-ui.store";
import type { EdithorProps, EdithorViewerMethods } from "./types";

export type {
	EdithorViewer,
	EdithorViewerMethods,
	EdithorViewerProps,
} from "./types";

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

function getVisibleSourceLineElements(container: HTMLElement): HTMLElement[] {
	const containerRect = container.getBoundingClientRect();

	return Array.from(
		container.querySelectorAll<HTMLElement>("[data-source-line]"),
	).filter((element) => {
		const rect = element.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0) return false;
		if (rect.bottom < containerRect.top || rect.top > containerRect.bottom) {
			return false;
		}
		if (rect.right < containerRect.left || rect.left > containerRect.right) {
			return false;
		}
		if (element.closest("[aria-hidden='true']")) return false;

		const style = window.getComputedStyle(element);
		return style.visibility !== "hidden" && style.display !== "none";
	});
}

function getClosestSourceLineElement(
	container: HTMLElement,
	line: number,
): HTMLElement | null {
	const elements = getVisibleSourceLineElements(container);
	if (elements.length === 0) return null;

	let best: HTMLElement | null = null;
	let bestDistance = Number.POSITIVE_INFINITY;

	for (const element of elements) {
		const rawLine = Number(element.dataset.sourceLine);
		if (!Number.isFinite(rawLine)) continue;
		const distance = Math.abs(rawLine - line);
		if (distance < bestDistance) {
			best = element;
			bestDistance = distance;
		}
	}

	return best;
}

function getCenterSourceLineElement(
	container: HTMLElement,
): HTMLElement | null {
	const rect = container.getBoundingClientRect();
	const centerX = rect.left + rect.width / 2;
	const centerY = rect.top + rect.height / 2;

	const elements = document.elementsFromPoint(centerX, centerY);
	for (const element of elements) {
		if (!(element instanceof HTMLElement)) continue;
		if (!container.contains(element)) continue;
		if (element.dataset.sourceLine) {
			const style = window.getComputedStyle(element);
			if (
				style.visibility !== "hidden" &&
				style.display !== "none" &&
				!element.closest("[aria-hidden='true']")
			) {
				return element;
			}
		}
		const annotatedAncestor =
			element.closest<HTMLElement>("[data-source-line]");
		if (
			annotatedAncestor &&
			container.contains(annotatedAncestor) &&
			!annotatedAncestor.closest("[aria-hidden='true']")
		) {
			return annotatedAncestor;
		}
	}

	const allAnnotated = getVisibleSourceLineElements(container);
	if (allAnnotated.length === 0) return null;

	let best: HTMLElement | null = null;
	let bestDistance = Number.POSITIVE_INFINITY;

	for (const element of allAnnotated) {
		const elementRect = element.getBoundingClientRect();
		const elementCenterY = elementRect.top + elementRect.height / 2;
		const distance = Math.abs(elementCenterY - centerY);
		if (distance < bestDistance) {
			best = element;
			bestDistance = distance;
		}
	}

	return best;
}

function scrollContainerToCenterElement(
	container: HTMLElement,
	element: HTMLElement,
): void {
	const containerRect = container.getBoundingClientRect();
	const elementRect = element.getBoundingClientRect();
	const delta =
		elementRect.top -
		containerRect.top -
		container.clientHeight / 2 +
		elementRect.height / 2;
	const maxScrollTop = Math.max(
		0,
		container.scrollHeight - container.clientHeight,
	);
	container.scrollTop = clamp(container.scrollTop + delta, 0, maxScrollTop);
}

function getElementDebugText(element: HTMLElement | null): string {
	if (!element) return "";
	return (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
}

function clearPreviewDebugMarkers(container: HTMLElement | null): void {
	if (!container) return;
	for (const element of container.querySelectorAll<HTMLElement>(
		"[data-align-debug-selected='true']",
	)) {
		element.removeAttribute("data-align-debug-selected");
		element.style.outline = "";
		element.style.outlineOffset = "";
		element.style.backgroundColor = "";
	}
}

function markPreviewDebugElement(element: HTMLElement | null): void {
	if (!element) return;
	element.dataset.alignDebugSelected = "true";
	element.style.outline = "2px solid #ef4444";
	element.style.outlineOffset = "2px";
	element.style.backgroundColor = "rgb(239 68 68 / 0.08)";
}

function decodeDataUrlPayload(dataUrl: string): string | null {
	const match = dataUrl.match(/^data:.*?;base64,(.*)$/);
	if (!match) return null;
	try {
		return atob(match[1]);
	} catch {
		return null;
	}
}

export function Edithor({
	files = [],
	open,
	adapter,
	onResetWorkspace,
	config,
	previewContent,
	previewHeaderExtras,
	viewer,
}: EdithorProps) {
	const {
		layout,
		handleLayoutChanged,
		activeFileId,
		setActiveFileId,
		handleFileSelect,
		handleFileDelete,
		handleFileRename,
		handleUpload,
		handleResetWorkspace,
	} = useEdithor({
		open,
		adapter,
		onResetWorkspace,
		storageKey: "edithor-layout",
	});
	// const [previewSnapshot, setPreviewSnapshot] = useState<
	// 	Record<string, string>
	// >({});
	const [lastModified, setLastModified] = useState<number>(0);
	const [editorScrollElement, setEditorScrollElement] =
		useState<HTMLElement | null>(null);
	const [previewScrollElement, setPreviewScrollElement] =
		useState<HTMLDivElement | null>(null);
	const [editorView, setEditorView] = useState<EditorView | null>(null);
	const fileContentsRef = useRef<Record<string, string>>({});

	const isLivePreviewEnabled = useEdithorUiStore(
		(state) => state.isLivePreviewEnabled,
	);
	const setLivePreviewEnabled = useEdithorUiStore(
		(state) => state.setLivePreviewEnabled,
	);

	const activeFile = useMemo(
		() => files.find((f) => f.id === activeFileId) || null,
		[files, activeFileId],
	);
	const activeEditorFile = useMemo(() => {
		return activeFile || null;
	}, [
		activeFile?.id,
		activeFile?.name,
		activeFile?.deletable,
		activeFile?.editable,
		activeFile?.pinned,
	]);

	useEffect(() => {
		if (files.length === 0) return;
		if (activeFileId && files.some((file) => file.id === activeFileId)) return;

		const fallbackId =
			(open && files.some((file) => file.id === open) && open) || files[0]?.id;

		if (fallbackId) {
			setActiveFileId(fallbackId);
		}
	}, [activeFileId, files, open, setActiveFileId]);

	const fileIdToName = useMemo(
		() => Object.fromEntries(files.map((file) => [file.id, file.name])),
		[files],
	);

	const handleLivePreviewChange = useCallback(
		(enabled: boolean) => {
			setLivePreviewEnabled(enabled);
		},
		[setLivePreviewEnabled],
	);

	const triggerPreview = useCallback(() => {
		// setPreviewSnapshot({ ...fileContentsRef.current });
		// setPreviewLastModified(Date.now());
		setLastModified(Date.now());
	}, []);

	const handleFileSaved = useCallback(
		(fileId: string, content: string) => {
			const fileName = fileIdToName[fileId] ?? fileId;
			fileContentsRef.current = {
				...fileContentsRef.current,
				[fileName]: content,
			};
			if (isLivePreviewEnabled) {
				// triggerPreview();
				setLastModified(Date.now());
			}
		},
		[fileIdToName, isLivePreviewEnabled, triggerPreview],
	);
	const handleEditorBlur = useCallback(
		(fileId: string, content: string) => {
			const fileName = fileIdToName[fileId] ?? fileId;
			fileContentsRef.current = {
				...fileContentsRef.current,
				[fileName]: content,
			};
			if (!isLivePreviewEnabled) {
				triggerPreview();
			}
		},
		[fileIdToName, isLivePreviewEnabled, triggerPreview],
	);

	const handleAlignPreviewToEditor = useCallback(() => {
		clearPreviewDebugMarkers(previewScrollElement);
		if (!editorScrollElement || !previewScrollElement || !editorView) return;

		const editorRect = editorScrollElement.getBoundingClientRect();
		const position = editorView.posAtCoords({
			x: editorRect.left + Math.min(editorRect.width / 2, 48),
			y: editorRect.top + editorRect.height / 2,
		});
		if (position == null) {
			console.log("[align editor->preview] missing editor line", {
				position,
			});
			return;
		}

		const line = editorView.state.doc.lineAt(position).number;
		const targetElement = getClosestSourceLineElement(
			previewScrollElement,
			line,
		);
		if (!targetElement) {
			console.log("[align editor->preview] missing preview target", {
				editorLine: line,
			});
			return;
		}

		markPreviewDebugElement(targetElement);
		scrollContainerToCenterElement(previewScrollElement, targetElement);
		console.log("[align editor->preview] target", {
			editorLine: line,
			previewLine: Number(targetElement.dataset.sourceLine),
			previewTag: targetElement.tagName.toLowerCase(),
			previewText: getElementDebugText(targetElement),
		});
	}, [editorScrollElement, previewScrollElement, editorView]);

	const handleAlignEditorToPreview = useCallback(() => {
		clearPreviewDebugMarkers(previewScrollElement);
		if (!previewScrollElement || !editorView) return;

		const centerElement = getCenterSourceLineElement(previewScrollElement);
		if (!centerElement) {
			console.log("[align preview->editor] missing preview target");
			return;
		}

		const line = Number(centerElement.dataset.sourceLine);
		if (!Number.isFinite(line) || line < 1) {
			console.log("[align preview->editor] missing preview line", {
				previewTag: centerElement.tagName.toLowerCase(),
				previewText: getElementDebugText(centerElement),
			});
			return;
		}

		markPreviewDebugElement(centerElement);
		const docLine = editorView.state.doc.line(
			Math.min(line, editorView.state.doc.lines),
		);
		editorView.dispatch({
			effects: EditorView.scrollIntoView(docLine.from, {
				y: "center",
				yMargin: 0,
			}),
		});
		console.log("[align preview->editor] target", {
			editorLine: docLine.number,
			previewLine: line,
			previewTag: centerElement.tagName.toLowerCase(),
			previewText: getElementDebugText(centerElement),
		});
	}, [previewScrollElement, editorView]);

	useEffect(() => {
		return () => {
			clearPreviewDebugMarkers(previewScrollElement);
		};
	}, [previewScrollElement]);

	// Viewer methods implementation
	const viewerMethods = useMemo<EdithorViewerMethods>(() => {
		return {
			// listFiles: () => files.map((f) => f.name),
			// listAssetFiles: () =>
			// 	files.filter((f) => f.editable && f.deletable).map((f) => f.name),
			// readFile: (fileName) => {
			// 	return previewSnapshot[fileName] ?? null;
			// },
			readAssetText: (fileName) => {
				return adapter.onReadFile(fileName);
			},
			readAssetDataUrl: async (fileName) => {
				const { data, lastModified } = await adapter.onReadFile(fileName);
				if (!data) return { data: "", lastModified: "" };
				return data.startsWith("data:")
					? { data, lastModified }
					: { data: "", lastModified: "" };
			},
			readJsonAsset: async <T,>(fileName: string) => {
				const { data, lastModified } = await adapter.onReadFile(fileName);
				if (!data)
					return { data: {} as T, resolvedFileName: "", lastModified: "" };
				const raw = data.startsWith("data:")
					? (decodeDataUrlPayload(data) ?? data)
					: data;
				try {
					return {
						data: JSON.parse(raw) as T,
						resolvedFileName: fileName,
						lastModified,
					};
				} catch {
					return { data: {} as T, resolvedFileName: "", lastModified: "" };
				}
			},
		};
	}, [files]);

	const view = useMemo(() => {
		return viewer
			? viewer({
					files: files,
					activeFile: activeFile?.name ?? open ?? files[0]?.name ?? "",
					methods: viewerMethods,
				})
			: previewContent;
	}, [lastModified, viewer, files, activeFile?.name, open, viewerMethods]);

	return (
		<ResizablePanelGroup
			className="h-full min-h-0 overflow-hidden"
			orientation="horizontal"
			defaultLayout={layout}
			onLayoutChanged={handleLayoutChanged}
		>
			<ResizablePanel id="edithor-file-tree" minSize={10}>
				<FileTree
					files={files}
					activeFileId={activeFileId}
					onSelect={handleFileSelect}
					onDelete={handleFileDelete}
					onRename={handleFileRename}
					onUpload={handleUpload}
					onResetWorkspace={handleResetWorkspace}
				/>
			</ResizablePanel>

			<ResizableHandle withHandle />

			<ResizablePanel id="edithor-editor" minSize={25}>
				<div className="flex h-full flex-col bg-background">
					{activeEditorFile ? (
						<EdithorEditor
							key={`${activeEditorFile.id}:${activeEditorFile.lastModified}`}
							file={activeEditorFile}
							adapter={adapter}
							config={config}
							isLivePreviewEnabled={isLivePreviewEnabled}
							onLivePreviewChange={handleLivePreviewChange}
							onFileSaved={handleFileSaved}
							onEditorBlur={handleEditorBlur}
							onScrollElementReady={(element) => {
								setEditorScrollElement((current) =>
									current === element ? current : element,
								);
							}}
							onEditorViewReady={(view) => {
								setEditorView((current) => (current === view ? current : view));
							}}
						/>
					) : (
						<div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
							Select a file to edit
						</div>
					)}
				</div>
			</ResizablePanel>

			<ResizableHandle withHandle className="flex-col">
				<div className="absolute top-40 -left-3  z-10 flex flex-col items-center gap-1 rounded-full border bg-background px-1.5 py-1 shadow-sm">
					<button
						type="button"
						className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						onClick={handleAlignEditorToPreview}
						aria-label="Align editor to preview"
					>
						<ArrowLeft className="size-3" />
					</button>
					<button
						type="button"
						className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						onClick={handleAlignPreviewToEditor}
						aria-label="Align preview to editor"
					>
						<ArrowRight className="size-3" />
					</button>
				</div>
			</ResizableHandle>

			<ResizablePanel
				id="editor-preview"
				minSize={25}
				className="min-h-0 overflow-hidden"
			>
				<div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
					<div className="flex min-h-12 shrink-0 items-center justify-between border-b bg-muted/30 p-2">
						<Button
							type="button"
							size="xs"
							variant="outline"
							onClick={triggerPreview}
						>
							<RefreshCw className="size-3.5" />
							Refresh
						</Button>
						{previewHeaderExtras ? (
							<div className="flex items-center gap-2">
								{previewHeaderExtras}
							</div>
						) : null}
					</div>
					<ScrollArea
						className="min-h-0 flex-1"
						viewportRef={(element) => {
							setPreviewScrollElement((current) =>
								current === element ? current : element,
							);
						}}
					>
						{view}
					</ScrollArea>
				</div>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}
