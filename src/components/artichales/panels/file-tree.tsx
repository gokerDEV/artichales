import { Database, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileTreeProps {
	activeFile: string;
	onSelectFile: (fileName: string) => void;
	files: string[];
}

export function FileTree({ activeFile, onSelectFile, files }: FileTreeProps) {
	return (
		<div className="flex h-full flex-col gap-2">
			<div className="mb-2 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
				Workspace
			</div>
			{files.map((file) => {
				const isBib = file.endsWith(".bib");
				return (
					<button
						type="button"
						key={file}
						onClick={() => onSelectFile(file)}
						className={cn(
							"flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
							activeFile === file
								? "bg-primary/10 font-medium text-primary"
								: "text-muted-foreground hover:bg-muted hover:text-foreground",
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
