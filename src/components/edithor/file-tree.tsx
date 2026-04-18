import React, { useState, useCallback, useMemo } from "react";
import {
	FileText,
	Trash2,
	Edit2,
	UploadCloud,
	Pin,
	AlertCircle,
	RotateCcw,
} from "lucide-react";
import type { EdithorFile } from "@/components/edithor/types";
import { formatDate } from "@/lib/edithor.utils";
import { toast } from "sonner";

import {
	ContextMenu,
	ContextMenuTrigger,
	ContextMenuContent,
	ContextMenuItem,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface Props {
	files: EdithorFile[];
	activeFileId: string | null;
	onSelect: (id: string) => void;
	onDelete: (id: string) => Promise<void>;
	onRename: (id: string, newName: string) => Promise<void>;
	onUpload: (files: File[]) => Promise<void>;
	onResetWorkspace?: () => Promise<void>;
}

export function FileTree({
	files,
	activeFileId,
	onSelect,
	onDelete,
	onRename,
	onUpload,
	onResetWorkspace,
}: Props) {
	const [isDragging, setIsDragging] = useState(false);
	const [renameFile, setRenameFile] = useState<EdithorFile | null>(null);
	const [newName, setNewName] = useState("");
	const [isProcessing, setIsProcessing] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
	const fileInputRef = React.useRef<HTMLInputElement | null>(null);

	const displayFiles = useMemo(() => {
		// Create a stable list: pinned files first (preserve pinned order),
		// then non-pinned files sorted by name. Annotate each entry with
		// UI flags so rendering can rely on consistent properties.
		const pinnedFiles = files
			.filter((f) => f.pinned)
			.map((f) => ({
				...f,
				isPinned: true,
				deletable: f.deletable,
				editable: f.editable,
			}));

		const assetFiles = files
			.filter((f) => !f.pinned)
			.slice() // avoid mutating the original array
			.sort((a, b) => a.name.localeCompare(b.name))
			.map((f) => ({
				...f,
				isPinned: false,
				deletable: f.deletable,
				editable: f.editable,
			}));

		return [...pinnedFiles, ...assetFiles];
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
			setUploadError(null);

			const droppedFiles = Array.from(e.dataTransfer.files);
			if (droppedFiles.length > 0) {
				setIsProcessing(true);
				try {
					await onUpload(droppedFiles);
					toast.success(`${droppedFiles.length} file(s) uploaded successfully`);
				} catch (error) {
					const message =
						error instanceof Error ? error.message : "Upload failed";
					setUploadError(message);
					toast.error(message);
				} finally {
					setIsProcessing(false);
				}
			}
		},
		[onUpload],
	);

	const handleFileInputChange = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const selectedFiles = Array.from(e.target.files ?? []);
			if (selectedFiles.length === 0) return;

			setUploadError(null);
			setIsProcessing(true);
			try {
				await onUpload(selectedFiles);
				toast.success(`${selectedFiles.length} file(s) uploaded successfully`);
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Upload failed";
				setUploadError(message);
				toast.error(message);
			} finally {
				setIsProcessing(false);
				e.target.value = "";
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

	const handleDeleteFile = useCallback(
		async (file: EdithorFile) => {
			const confirmed = window.confirm(`Delete "${file.name}"?`);
			if (!confirmed) return;

			setIsProcessing(true);
			try {
				await onDelete(file.id);
				toast.success(`File "${file.name}" deleted`);
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Delete failed";
				toast.error(message);
			} finally {
				setIsProcessing(false);
			}
		},
		[onDelete],
	);

	const handleRenameSubmit = useCallback(async () => {
		if (!renameFile || !newName.trim() || newName.trim() === renameFile.name) {
			closeRenameDialog();
			return;
		}

		setIsProcessing(true);
		try {
			await onRename(renameFile.id, newName.trim());
			toast.success(`File renamed to "${newName.trim()}"`);
			closeRenameDialog();
		} catch (error) {
			const message = error instanceof Error ? error.message : "Rename failed";
			toast.error(message);
		} finally {
			setIsProcessing(false);
		}
	}, [renameFile, newName, onRename, closeRenameDialog]);

	const handleResetWorkspace = useCallback(async () => {
		if (!onResetWorkspace) return;

		setIsProcessing(true);
		setUploadError(null);
		try {
			await onResetWorkspace();
			toast.success("Workspace reset to defaults");
			setIsResetDialogOpen(false);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Workspace reset failed";
			setUploadError(message);
			toast.error(message);
		} finally {
			setIsProcessing(false);
		}
	}, [onResetWorkspace]);

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
			<input
				ref={fileInputRef}
				type="file"
				multiple
				accept=".json,.svg,.png,.jpg,.jpeg,.gif"
				className="hidden"
				onChange={handleFileInputChange}
			/>
			<div className="p-3 border-b flex items-center justify-between text-sm font-medium text-muted-foreground select-none">
				<span>Workspace</span>
				<div className="flex items-center gap-1">
					<Button
						type="button"
						size="icon"
						variant="ghost"
						className="h-7 w-7"
						disabled={isProcessing}
						onClick={() => fileInputRef.current?.click()}
						aria-label="Upload files"
					>
						<UploadCloud
							className={cn(
								"w-4 h-4 transition-opacity",
								isDragging ? "opacity-100 text-primary" : "opacity-70",
							)}
						/>
					</Button>
					<Button
						type="button"
						size="icon"
						variant="ghost"
						className="h-7 w-7"
						disabled={isProcessing || !onResetWorkspace}
						onClick={() => setIsResetDialogOpen(true)}
						aria-label="Reset workspace"
					>
						<RotateCcw className="w-4 h-4 opacity-70" />
					</Button>
				</div>
			</div>

			{uploadError && (
				<div className="px-3 pt-2">
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>{uploadError}</AlertDescription>
					</Alert>
				</div>
			)}

			<ScrollArea className="flex-1">
				<div className="p-2 space-y-0.5">
					{displayFiles.map((file) => (
						<ContextMenu key={file.id}>
							<ContextMenuTrigger asChild>
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
											{formatDate(new Date(file.lastModified).getTime())}
										</span>
									</div>
								</button>
							</ContextMenuTrigger>

							<ContextMenuContent className="w-48">
								<ContextMenuItem
									onClick={() => {
										if (file.editable && !isProcessing) openRenameDialog(file);
									}}
									disabled={!file.editable || isProcessing}
								>
									<Edit2 className="w-4 h-4 mr-2" />
									Rename
								</ContextMenuItem>
								<ContextMenuSeparator />
								<ContextMenuItem
									onClick={() => {
										if (file.deletable && !isProcessing) handleDeleteFile(file);
									}}
									disabled={!file.deletable || isProcessing}
									variant="destructive"
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

			<AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Reset workspace?</AlertDialogTitle>
						<AlertDialogDescription>
							This will replace the current workspace files with the default
							template, article, and bibliography files. Uploaded asset files
							will be removed.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isProcessing}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								void handleResetWorkspace();
							}}
							disabled={isProcessing}
						>
							Reset
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
