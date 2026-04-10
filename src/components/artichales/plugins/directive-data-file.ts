import * as React from "react";
import { useWorkspaceStore } from "@/store/workspace.store";

export function useDirectiveDataFile(dataFile?: string): {
	content: string | null;
	lastUpdated: number | null;
} {
	const assetName =
		typeof dataFile === "string" && dataFile.trim() !== ""
			? dataFile.trim()
			: null;
	const content = useWorkspaceStore((state) =>
		assetName ? (state.rawFiles[assetName] ?? null) : null,
	);
	const lastUpdated = useWorkspaceStore((state) => {
		if (!assetName) return null;
		return (
			state.assetFiles.find((asset) => asset.name === assetName)?.lastUpdated ??
			null
		);
	});
	return { content, lastUpdated };
}

export function useDirectiveJsonData<T>(dataFile?: string): {
	data: T | null;
	lastUpdated: number | null;
} {
	const { content, lastUpdated } = useDirectiveDataFile(dataFile);
	const data = React.useMemo(() => {
		if (!content) return null;
		try {
			return JSON.parse(content) as T;
		} catch {
			return null;
		}
	}, [content]);
	return { data, lastUpdated };
}
