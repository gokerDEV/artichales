import { Database, FileText, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { isCoreWorkspaceFile, orderWorkspaceFiles } from "@/lib/workspace";

export interface FileTreeProps {
	activeFile: string;
	onSelectFile: (fileName: string) => void;
	files: string[];
	disableFileSwitch?: boolean;
	onRenameAsset?: (fileName: string) => void;
	onDeleteAsset?: (fileName: string) => void;
}

export function FileTree({
	activeFile,
	onSelectFile,
	files,
	disableFileSwitch = false,
	onRenameAsset,
	onDeleteAsset,
}: FileTreeProps) {
	const orderedFiles = orderWorkspaceFiles(files);

	return (
		<div className="flex h-full flex-col gap-2">
			<div className="mb-2 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
				Workspace
			</div>
			{orderedFiles.map((file) => {
				const isBib = file.endsWith(".bib");
				const isCore = isCoreWorkspaceFile(file);
				return (
					<div
						key={file}
						className={cn(
							"group flex items-center gap-1 rounded-md",
							activeFile === file ? "bg-primary/10" : "",
						)}
					>
						<button
							type="button"
							disabled={disableFileSwitch && file !== activeFile}
							onClick={() => onSelectFile(file)}
							className={cn(
								"flex flex-1 items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
								activeFile === file
									? "font-medium text-primary"
									: "text-muted-foreground hover:bg-muted hover:text-foreground",
								disableFileSwitch && file !== activeFile
									? "cursor-not-allowed opacity-50"
									: "",
							)}
						>
							{isBib ? (
								<Database className="h-4 w-4" />
							) : (
								<FileText className="h-4 w-4" />
							)}
							{file}
						</button>
						{!isCore ? (
							<div className="mr-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
								<button
									type="button"
									onClick={() => onRenameAsset?.(file)}
									className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
									aria-label={`Rename ${file}`}
								>
									<Pencil className="h-3.5 w-3.5" />
								</button>
								<button
									type="button"
									onClick={() => onDeleteAsset?.(file)}
									className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
									aria-label={`Delete ${file}`}
								>
									<Trash2 className="h-3.5 w-3.5" />
								</button>
							</div>
						) : null}
					</div>
				);
			})}
		</div>
	);
}
