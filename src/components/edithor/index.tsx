// export { EdithorSurface } from "@/components/edithor/surfaces/edithor-surface";
// export type {
// 	EdithorViewer,
// 	EdithorViewerMethods,
// 	EdithorViewerProps,
// } from "@/components/edithor/types";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
	} = useEdithor({
		open,
		adapter,
		storageKey: "edithor-layout",
	});
	// const [previewSnapshot, setPreviewSnapshot] = useState<
	// 	Record<string, string>
	// >({});
	const [lastModified, setLastModified] = useState<number>(0);
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
				return adapter.onReadFile(fileName) ?? null;
			},
			readAssetDataUrl: async (fileName) => {
				const content = await  adapter.onReadFile(fileName);
				if (!content) return null;
				return content.startsWith("data:") ? content : null;
			},
			readJsonAsset: async <T,>(fileName: string) => {
				const content = await adapter.onReadFile(fileName);
				if (!content) return null;
				const raw = content.startsWith("data:")
					? (decodeDataUrlPayload(content) ?? content)
					: content;
				try {
					return {
						data: JSON.parse(raw) as T,
						resolvedFileName: fileName,
					};
				} catch {
					return null;
				}
			},
		};
	}, [files]);

	const  view  = useMemo(() => {

		console.log("view triggered", { files, activeFile, open, viewer });

		return viewer
			? viewer({
				files: files,
				activeFile: activeFile?.name ?? open ?? files[0]?.name ?? "",
				methods: viewerMethods,
			})
			: previewContent
	}, [lastModified]);


	console.log('Edithor',{activeFileId, files}, lastModified);



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
				/>
			</ResizablePanel>

			<ResizableHandle withHandle />

			<ResizablePanel id="edithor-editor" minSize={25}>
				<div className="flex h-full flex-col bg-background">
					{activeEditorFile ? (
						<EdithorEditor
							file={activeEditorFile}
							adapter={adapter}
							config={config}
							isLivePreviewEnabled={isLivePreviewEnabled}
							onLivePreviewChange={handleLivePreviewChange}
							onFileSaved={handleFileSaved}
							onEditorBlur={handleEditorBlur}
						/>
					) : (
						<div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
							Select a file to edit
						</div>
					)}
				</div>
			</ResizablePanel>

			<ResizableHandle withHandle />

			<ResizablePanel id="editor-preview" minSize={25}>
				<div className="relative flex h-full flex-col bg-background">
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
					<ScrollArea className="flex-1 overflow-auto">
						{view}
					</ScrollArea>
				</div>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}
