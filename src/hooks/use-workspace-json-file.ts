import * as React from "react";
import { useWorkspaceStore } from "@/store/workspace.store";

export type WorkspaceJsonFile<T> = {
	data: T | null;
	lastUpdated: number | null;
};

/**
 * Reads a raw JSON file from the workspace store and parses it.
 * Re-parses only when the file content changes (memoized by content string).
 * Returns `lastUpdated` from asset metadata for render invalidation.
 */
export function useWorkspaceJsonFile<T>(
	dataFile: string,
): WorkspaceJsonFile<T> {
	const file = dataFile.trim();

	const content = useWorkspaceStore((state) =>
		file ? (state.rawFiles[file] ?? null) : null,
	);

	const lastUpdated = useWorkspaceStore((state) => {
		if (!file) return null;
		return (
			state.workspaceFiles.find((entry) => entry.name === file)?.lastUpdated ??
			null
		);
	});

	const data = React.useMemo<T | null>(() => {
		if (!content) return null;
		try {
			return JSON.parse(content) as T;
		} catch {
			return null;
		}
	}, [content]);

	return { data, lastUpdated };
}
