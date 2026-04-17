import { useState, useCallback } from "react";
import type { EdithorAdapter } from "@/components/edithor/types";

export interface UseEdithorProps {
	adapter: EdithorAdapter;
	defaultLayout?: number[];
	storageKey?: string;
}

export function useEdithor({
	adapter,
	defaultLayout = [20, 40, 40],
	storageKey = "edithor-layout",
}: UseEdithorProps) {
	const [layout, setLayout] = useState<number[]>(() => {
		if (typeof window === "undefined") return defaultLayout;

		try {
			const stored = window.localStorage.getItem(storageKey);
			return stored ? JSON.parse(stored) : defaultLayout;
		} catch {
			return defaultLayout;
		}
	});

	const [activeFileId, setActiveFileId] = useState<string | null>(null);

	const handleLayoutChanged = useCallback(
		(sizes: number[]) => {
			setLayout(sizes);
			if (typeof window !== "undefined") {
				window.localStorage.setItem(storageKey, JSON.stringify(sizes));
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
		activeFileId,
		setActiveFileId,
		handleFileSelect,
		handleFileDelete,
		handleFileRename,
		handleUpload,
	};
}
