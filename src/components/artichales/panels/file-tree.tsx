import { Database, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { orderWorkspaceFiles } from "@/lib/workspace";

export interface FileTreeProps {
	activeFile: string;
	onSelectFile: (fileName: string) => void;
	files: string[];
	disableFileSwitch?: boolean;
}

export function FileTree({
	activeFile,
	onSelectFile,
	files,
	disableFileSwitch = false,
}: FileTreeProps) {
	const orderedFiles = orderWorkspaceFiles(files);

	return (
		<div className="flex h-full flex-col gap-2">
			<div className="mb-2 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
				Workspace
			</div>
			{orderedFiles.map((file) => {
				const isBib = file.endsWith(".bib");
				return (
					<button
						type="button"
						key={file}
						disabled={disableFileSwitch && file !== activeFile}
						onClick={() => onSelectFile(file)}
						className={cn(
							"flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
							activeFile === file
								? "bg-primary/10 font-medium text-primary"
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
				);
			})}
		</div>
	);
}
