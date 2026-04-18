import { useCallback, useEffect } from "react";
import { edithorDefaultLayout, useEdithorStore } from "@/lib/edithor.store";
import type { EdithorFile } from "@/components/edithor/types";
import type { EdithorAdapter } from "@/components/edithor/types";

interface Props {
	open?: string;
	adapter: EdithorAdapter;
	storageKey?: string;
	onResetWorkspace?: () => Promise<void>;
}

export function useEdithor({
	open,
	adapter,
	onResetWorkspace,
	storageKey: _storageKey = "edithor-layout",
}: Props) {
	void _storageKey;

	const layout = useEdithorStore((state) => state.layout);
	const setLayout = useEdithorStore((state) => state.setLayout);
	const activeFileId = useEdithorStore((state) => state.activeFileId);
	const setActiveFileId = useEdithorStore((state) => state.setActiveFileId);

	useEffect(() => {
		if (!activeFileId && open) {
			setActiveFileId(open);
		}
	}, [activeFileId, open, setActiveFileId]);

	const handleLayoutChanged = useCallback(
		(layout: Record<string, number>) => {
			setLayout(layout);
		},
		[setLayout],
	);

	const handleFileSelect = useCallback(
		(fileId: string) => {
			setActiveFileId(fileId);
		},
		[setActiveFileId],
	);

	const handleFileDelete = useCallback(
		async (fileId: string) => {
			await adapter.onDelete(fileId);
			if (activeFileId === fileId) {
				setActiveFileId(null);
			}
		},
		[adapter, activeFileId, setActiveFileId],
	);

	const handleFileRename = useCallback(
		async (fileId: string, newName: string) => {
			await adapter.onRename(fileId, newName);
		},
		[adapter],
	);

	const handleUpload = useCallback(
		async (files: File[]) => {
			await adapter.onUpload(files);
		},
		[adapter],
	);

	const handleResetWorkspace = useCallback(async () => {
		if (!onResetWorkspace) return;
		await onResetWorkspace();
		setActiveFileId(open ?? null);
	}, [onResetWorkspace, open, setActiveFileId]);

	return {
		layout,
		handleLayoutChanged,
		defaultLayout: edithorDefaultLayout,
		activeFileId,
		setActiveFileId,
		handleFileSelect,
		handleFileDelete,
		handleFileRename,
		handleUpload,
		handleResetWorkspace,
	};
}
