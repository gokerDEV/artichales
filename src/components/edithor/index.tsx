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
import { debounce } from "@/lib/edithor.utils";
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
		handleFileSelect,
		handleFileDelete,
		handleFileRename,
		handleUpload,
	} = useEdithor({
		open,
		adapter,
		storageKey: "edithor-layout",
	});
	const [previewSnapshot, setPreviewSnapshot] = useState<
		Record<string, string>
	>({});
	const fileContentsRef = useRef<Record<string, string>>({});
	const isLivePreviewEnabled = useEdithorUiStore(
		(state) => state.isLivePreviewEnabled,
	);
	const setLivePreviewEnabled = useEdithorUiStore(
		(state) => state.setLivePreviewEnabled,
	);

	useEffect(() => {
		let isMounted = true;

		const loadAllFiles = async () => {
			const entries = await Promise.all(
				files.map(async (file) => {
					try {
						const content = await adapter.onReadFile(file.id);
						return [file.name, content] as const;
					} catch {
						return [file.name, ""] as const;
					}
				}),
			);

			if (!isMounted) return;
			const next = Object.fromEntries(entries);
			fileContentsRef.current = next;
			setPreviewSnapshot(next);
		};

		void loadAllFiles();

		return () => {
			isMounted = false;
		};
	}, [adapter, files]);

	const activeFile = useMemo(
		() => files.find((f) => f.id === activeFileId) || null,
		[files, activeFileId],
	);
	const fileIdToName = useMemo(
		() => Object.fromEntries(files.map((file) => [file.id, file.name])),
		[files],
	);
	const triggerPreview = useCallback(
		() => setPreviewSnapshot({ ...fileContentsRef.current }),
		[],
	);
	const debouncedTriggerPreview = useMemo(
		() => debounce(triggerPreview, 250),
		[triggerPreview],
	);
	const handleLivePreviewChange = useCallback(
		(enabled: boolean) => {
			setLivePreviewEnabled(enabled);
			if (enabled) {
				debouncedTriggerPreview();
			}
		},
		[debouncedTriggerPreview, setLivePreviewEnabled],
	);
	const handleContentChange = useCallback(
		(fileId: string, content: string) => {
			const fileName = fileIdToName[fileId] ?? fileId;
			fileContentsRef.current = {
				...fileContentsRef.current,
				[fileName]: content,
			};
			if (isLivePreviewEnabled) {
				debouncedTriggerPreview();
			}
		},
		[debouncedTriggerPreview, fileIdToName, isLivePreviewEnabled],
	);
	const handleEditorBlur = useCallback(() => {
		if (!isLivePreviewEnabled) {
			triggerPreview();
		}
	}, [isLivePreviewEnabled, triggerPreview]);

	useEffect(() => {
		return () => {
			debouncedTriggerPreview.cancel();
		};
	}, [debouncedTriggerPreview]);

	const viewerFiles = useMemo(
		() =>
			Object.fromEntries(
				files.map((file) => [file.name, previewSnapshot[file.name] ?? ""]),
			),
		[files, previewSnapshot],
	);

	// Viewer methods implementation
	const viewerMethods = useMemo<EdithorViewerMethods>(() => {
		return {
			listFiles: () => files.map((f) => f.name),
			listAssetFiles: () =>
				files.filter((f) => f.editable && f.deletable).map((f) => f.name),
			readFile: (fileName) => {
				return previewSnapshot[fileName] ?? null;
			},
			readAssetText: (fileName) => {
				return previewSnapshot[fileName] ?? null;
			},
			readAssetDataUrl: (fileName) => {
				const content = previewSnapshot[fileName];
				if (!content) return null;
				return content.startsWith("data:") ? content : null;
			},
			readJsonAsset: <T,>(fileName: string) => {
				const content = previewSnapshot[fileName];
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
	}, [files, previewSnapshot]);

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
					{activeFile ? (
						<EdithorEditor
							file={activeFile}
							adapter={adapter}
							config={config}
							isLivePreviewEnabled={isLivePreviewEnabled}
							onLivePreviewChange={handleLivePreviewChange}
							onContentChange={handleContentChange}
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
						{viewer
							? viewer({
									files: viewerFiles,
									activeFile: activeFile?.name ?? open ?? files[0]?.name ?? "",
									methods: viewerMethods,
								})
							: previewContent}
					</ScrollArea>
				</div>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}
