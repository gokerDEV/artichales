import { useState, useCallback } from "react";
import type { EdithorAdapter } from "@/components/edithor/types";

interface Props {
	open?: string;
	adapter: EdithorAdapter;
	defaultLayout?: number[];
	storageKey?: string;
}

const  defaultLayout = {
	'edithor-file-tree':20,
	'edithor-editor': 40,
	'edithor-view': 40
}

export function useEdithor({
	open,
	adapter,
	storageKey = "edithor-layout",
}: Props) {

	const [layout, setLayout] = useState<{ [id: string]: number }>(() => {
		if (typeof window === "undefined") return defaultLayout;
		try {
			const stored = window.localStorage.getItem(storageKey);
			return  stored ? JSON.parse(stored) : defaultLayout;
		} catch {
			return  defaultLayout
		}
	});

	const [activeFileId, setActiveFileId] = useState<string | null>(open || null);

	const handleLayoutChanged = useCallback(
		(layout: Record<string, number>) => {
			setLayout(layout);
			if (typeof window !== "undefined") {
				window.localStorage.setItem(storageKey, JSON.stringify(layout));
			}
		},
		[storageKey],
	);

	const handleFileSelect = useCallback((fileId: string) => {
		setActiveFileId(fileId);
	}, []);

	const handleFileDelete = useCallback(
		async (fileId: string) => {
			await adapter.onDelete(fileId);
			if (activeFileId === fileId) {
				setActiveFileId(null);
			}
		},
		[adapter, activeFileId],
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

	return {
		layout,
		handleLayoutChanged,
		defaultLayout,
		activeFileId,
		setActiveFileId,
		handleFileSelect,
		handleFileDelete,
		handleFileRename,
		handleUpload,
	};
}
