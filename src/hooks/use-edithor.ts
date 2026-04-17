import { useCallback, useState } from "react";
import type { EdithorAdapter } from "@/components/edithor/types";

interface Props {
	open?: string;
	adapter: EdithorAdapter;
	storageKey?: string;
}

const defaultLayout = {
	"edithor-file-tree": 20,
	"edithor-editor": 40,
	"editor-preview": 40,
};

function normalizeLayout(
	layout: Record<string, number>,
): Record<string, number> {
	const next = { ...layout };
	if (typeof next["edithor-view"] === "number") {
		next["editor-preview"] = next["edithor-view"];
		delete next["edithor-view"];
	}
	return {
		...defaultLayout,
		...next,
	};
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
			if (!stored) return defaultLayout;
			return normalizeLayout(JSON.parse(stored) as Record<string, number>);
		} catch {
			return defaultLayout;
		}
	});

	const [activeFileId, setActiveFileId] = useState<string | null>(open || null);

	const handleLayoutChanged = useCallback(
		(layout: Record<string, number>) => {
			const normalized = normalizeLayout(layout);
			setLayout(normalized);
			if (typeof window !== "undefined") {
				window.localStorage.setItem(storageKey, JSON.stringify(normalized));
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
