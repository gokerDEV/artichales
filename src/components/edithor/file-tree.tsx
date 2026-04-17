import React, { useState, useCallback, useMemo } from "react";
import { FileText, Trash2, Edit2, UploadCloud, Pin } from "lucide-react";
import type { EdithorFile } from "@/components/edithor/types.ts";

import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
	ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
	files: EdithorFile[];
	activeFileId: string | null;
	onSelect: (id: string) => void;
	onDelete: (id: string) => Promise<void>;
	onRename: (id: string, newName: string) => Promise<void>;
	onUpload: (files: File[]) => Promise<void>;
}

export function FileTree({
	files,
	activeFileId,
	onSelect,
	onDelete,
	onRename,
	onUpload,
}: Props) {
	const [isDragging, setIsDragging] = useState(false);
	const [renameFile, setRenameFile] = useState<EdithorFile | null>(null);
	const [newName, setNewName] = useState("");
	const [isProcessing, setIsProcessing] = useState(false);

	const displayFiles = useMemo(() => {
		const pinned = files.filter((f) => f.pinned);
		const assets = files

			.sort((a, b) => a.name.localeCompare(b.name))
			.map((f) => ({ ...f, isPinned: false, deletable: true, editable: true }));

		return [...pinned, ...assets];
	}, [files]);

	const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	}, []);

	const handleDrop = useCallback(
		async (e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDragging(false);

			const droppedFiles = Array.from(e.dataTransfer.files);
			if (droppedFiles.length > 0) {
				setIsProcessing(true);
				try {
					await onUpload(droppedFiles);
				} finally {
					setIsProcessing(false);
				}
			}
		},
		[onUpload],
	);

	const openRenameDialog = useCallback((file: EdithorFile) => {
		setRenameFile(file);
		setNewName(file.name);
	}, []);

	const closeRenameDialog = useCallback(() => {
		setRenameFile(null);
		setNewName("");
	}, []);

	const handleRenameSubmit = useCallback(async () => {
		if (!renameFile || !newName.trim() || newName.trim() === renameFile.name) {
			closeRenameDialog();
			return;
		}

		setIsProcessing(true);
		try {
			await onRename(renameFile.id, newName.trim());
			closeRenameDialog();
		} finally {
			setIsProcessing(false);
		}
	}, [renameFile, newName, onRename, closeRenameDialog]);

	return (
		<div
			className={cn(
				"flex flex-col h-full bg-background border-r transition-all duration-200 relative",
				isDragging && "bg-muted/50 ring-2 ring-primary ring-inset",
			)}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			<div className="p-3 border-b flex items-center justify-between text-sm font-medium text-muted-foreground select-none">
				<span>Workspace</span>
				<UploadCloud
					className={cn(
						"w-4 h-4 transition-opacity",
						isDragging ? "opacity-100 text-primary" : "opacity-50",
					)}
				/>
			</div>

			<ScrollArea className="flex-1">
				<div className="p-2 space-y-0.5">
					{displayFiles.map((file) => (
						<ContextMenu key={file.id}>
							<ContextMenuTrigger>
								<button
									onClick={() => onSelect(file.id)}
									disabled={isProcessing}
									className={cn(
										"w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors text-left group disabled:opacity-50",
										activeFileId === file.id
											? "bg-primary/10 text-primary font-medium"
											: "hover:bg-muted text-foreground/80",
									)}
								>
									{file.isPinned ? (
										<Pin className="w-3.5 h-3.5 text-primary shrink-0 fill-primary" />
									) : (
										<FileText className="w-3.5 h-3.5 opacity-70 shrink-0 group-hover:opacity-100 transition-opacity" />
									)}
									<div className="flex flex-col flex-1 overflow-hidden">
										<span className="truncate">{file.name}</span>
										<span className="text-[10px] text-muted-foreground truncate">
											{formatDate(new Date(file.lastModified))}
										</span>
									</div>
								</button>
							</ContextMenuTrigger>
							<ContextMenuContent className="w-48">
								<ContextMenuItem
									onClick={() => openRenameDialog(file)}
									disabled={isProcessing || !file.editable}
								>
									<Edit2 className="w-4 h-4 mr-2" />
									Rename
								</ContextMenuItem>
								<ContextMenuSeparator />
								<ContextMenuItem
									onClick={() => onDelete(file.id)}
									disabled={isProcessing || !file.deletable}
									className="text-destructive focus:text-destructive focus:bg-destructive/10"
								>
									<Trash2 className="w-4 h-4 mr-2" />
									Delete
								</ContextMenuItem>
							</ContextMenuContent>
						</ContextMenu>
					))}

					{displayFiles.length === 0 && (
						<div className="p-6 text-center text-sm text-muted-foreground border-2 border-dashed rounded-md m-2 pointer-events-none">
							Drop files here to upload
						</div>
					)}
				</div>
			</ScrollArea>

			<Dialog
				open={!!renameFile}
				onOpenChange={(open) => !open && closeRenameDialog()}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Rename File</DialogTitle>
					</DialogHeader>
					<Input
						value={newName}
						onChange={(e) => setNewName(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit()}
						disabled={isProcessing}
						autoFocus
					/>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={closeRenameDialog}
							disabled={isProcessing}
						>
							Cancel
						</Button>
						<Button onClick={handleRenameSubmit} disabled={isProcessing}>
							Save
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

//src/
// ├── components/
// │   └── edithor/
// │       ├── index.tsx           # Ana Layout (3 Panel + Preview Slot)
// │       ├── editor.tsx          # CodeMirror (MD, JSON, BibTeX)
// │       ├── file-tree.tsx       # Tree View (Drag&Drop + Context Menu)
// │       ├── auto-completer.ts   # Autocomplete logic
// │       └── types.ts            # Shared Interfaces
// ├── hooks/
// │   └── use-edithor.ts          # State, FS yönetimi ve Layout persistence
// └── utils/
//     ├── edithor.utils.ts        # Helper'lar
//     └── edithor.validators.ts   # Dosya ve boyut kontrolleri
