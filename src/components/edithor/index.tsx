// export { EdithorSurface } from "@/components/edithor/surfaces/edithor-surface";
// export type {
// 	EdithorViewer,
// 	EdithorViewerMethods,
// 	EdithorViewerProps,
// } from "@/components/edithor/types";

import { useMemo } from "react";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";

import { FileTree } from "./file-tree";
import { EdithorEditor } from "./editor";
import { useEdithor } from "@/hooks/use-edithor";
import type { EdithorProps, EdithorViewerMethods } from "./types";

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
		storageKey: "edithor-layout"
	});

	const activeFile = useMemo(
		() => files.find((f) => f.id === activeFileId) || null,
		[files, activeFileId],
	);

	// Viewer methods implementation
	const viewerMethods = useMemo<EdithorViewerMethods>(() => {
		return {
			listFiles: () => files.map((f) => f.name),
			listAssetFiles: () =>
				files
					.filter((f) => f.editable && f.deletable)
					.map((f) => f.name),
			readFile: (_fileName) => {
				// This would need content from adapter
				return null;
			},
			readAssetText: (_fileName) => {
				// This would need content from adapter
				return null;
			},
			readAssetDataUrl: (_fileName) => {
				// This would need content from adapter
				return null;
			},
			readJsonAsset: () => null,
		};
	}, [files]);


	return (
		<ResizablePanelGroup
			className="h-full min-h-0 overflow-hidden"
			orientation="horizontal"
			defaultLayout={layout}
			onLayoutChanged={handleLayoutChanged}
		>
			<ResizablePanel id='edithor-file-tree'  minSize={120}>
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

			<ResizablePanel id='edithor-editor' minSize={200}>
				<div className="h-full bg-background flex flex-col">
					{activeFile ? (
						<EdithorEditor
							file={activeFile}
							adapter={adapter}
							config={config}
						/>
					) : (
						<div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
							Select a file to edit
						</div>
					)}
				</div>
			</ResizablePanel>

			<ResizableHandle withHandle />

			<ResizablePanel id='editor-preview' minSize={200}>
				<div className="flex flex-col h-full bg-background relative">
					{previewHeaderExtras && (
						<div className="flex items-center p-2 border-b shrink-0 min-h-12 bg-muted/30">
							{previewHeaderExtras}
						</div>
					)}
					<div className="flex-1 overflow-auto">
						{viewer && activeFile ? (
							viewer({
								files: files.reduce(
									(acc, f) => {
										// Would need to fetch content from adapter
										acc[f.name] = "";
										return acc;
									},
									{} as Record<string, string>,
								),
								activeFile: activeFile.name,
								methods: viewerMethods,
							})
						) : (
							previewContent
						)}
					</div>
				</div>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}
