// export { EdithorSurface } from "@/components/edithor/surfaces/edithor-surface";
// export type {
// 	EdithorViewer,
// 	EdithorViewerMethods,
// 	EdithorViewerProps,
// } from "@/components/edithor/types";

import React, { useMemo } from "react";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";

import { FileTree } from "./file-tree";
import { EdithorEditor } from "./editor";
import { useEdithor } from "@/hooks/use-edithor";
import type { EdithorFile, EdithorProps } from "./types";

export interface EdithorRootProps extends EdithorProps {
	files?: EdithorFile[];
	defaultLayout?: number[];
	storageKey?: string;
}

export function Edithor({
	files = [],
	adapter,
	config,
	previewContent,
	previewHeaderExtras,
	defaultLayout = [20, 40, 40],
	storageKey = "edithor-layout",
}: EdithorRootProps) {
	const {
		layout,
		handleLayoutChanged,
		activeFileId,
		handleFileSelect,
		handleFileDelete,
		handleFileRename,
		handleUpload,
	} = useEdithor({
		adapter,
		defaultLayout,
		storageKey,
	});

	const activeFile = useMemo(
		() => files.find((f) => f.id === activeFileId) || null,
		[files, activeFileId],
	);

	return (
		<ResizablePanelGroup
			direction="horizontal"
			className="h-full min-h-0 overflow-hidden rounded-md border"
			onLayout={handleLayoutChanged}
		>
			<ResizablePanel defaultSize={layout[0]} minSize={15} maxSize={30}>
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

			<ResizablePanel defaultSize={layout[1]} minSize={20}>
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

			<ResizablePanel defaultSize={layout[2]} minSize={20}>
				<div className="flex flex-col h-full bg-background relative">
					{previewHeaderExtras && (
						<div className="flex items-center p-2 border-b shrink-0 min-h-12 bg-muted/30">
							{previewHeaderExtras}
						</div>
					)}
					<div className="flex-1 overflow-auto">{previewContent}</div>
				</div>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}
