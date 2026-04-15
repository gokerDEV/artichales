import { create } from "zustand";
import { CORE_ARTICLE_FILE, isCoreWorkspaceFile } from "@/lib/workspace";

type WorkspaceFiles = Record<string, string>;

type EdithorWorkspaceState = {
	files: WorkspaceFiles;
	activeFile: string;
	loading: boolean;
	saveError: string | null;
	setLoading: (value: boolean) => void;
	setSaveError: (value: string | null) => void;
	hydrate: (files: WorkspaceFiles) => void;
	setActiveFile: (fileName: string) => void;
	updateActiveFileContent: (content: string) => void;
	addOrReplaceFile: (fileName: string, content: string) => void;
	renameAsset: (from: string, to: string) => boolean;
	deleteAsset: (fileName: string) => void;
	resetWorkspace: (files: WorkspaceFiles) => void;
};

export const useEdithorWorkspaceStore = create<EdithorWorkspaceState>()(
	(set, get) => ({
		files: {},
		activeFile: CORE_ARTICLE_FILE,
		loading: true,
		saveError: null,
		setLoading: (value) => set({ loading: value }),
		setSaveError: (value) => set({ saveError: value }),
		hydrate: (files) =>
			set({
				files,
				activeFile: files[CORE_ARTICLE_FILE]
					? CORE_ARTICLE_FILE
					: (Object.keys(files)[0] ?? CORE_ARTICLE_FILE),
			}),
		setActiveFile: (fileName) => {
			const state = get();
			if (!state.files[fileName]) return;
			set({ activeFile: fileName });
		},
		updateActiveFileContent: (content) =>
			set((state) => ({
				files: {
					...state.files,
					[state.activeFile]: content,
				},
			})),
		addOrReplaceFile: (fileName, content) =>
			set((state) => ({
				files: {
					...state.files,
					[fileName]: content,
				},
			})),
		renameAsset: (from, to) => {
			const state = get();
			if (isCoreWorkspaceFile(from) || isCoreWorkspaceFile(to)) return false;
			if (!state.files[from] || state.files[to]) return false;
			const renamed = { ...state.files, [to]: state.files[from] };
			delete renamed[from];
			set({
				files: renamed,
				activeFile: state.activeFile === from ? to : state.activeFile,
			});
			return true;
		},
		deleteAsset: (fileName) =>
			set((state) => {
				if (isCoreWorkspaceFile(fileName)) return state;
				if (!state.files[fileName]) return state;
				const nextFiles = { ...state.files };
				delete nextFiles[fileName];
				return {
					files: nextFiles,
					activeFile:
						state.activeFile === fileName
							? nextFiles[CORE_ARTICLE_FILE]
								? CORE_ARTICLE_FILE
								: (Object.keys(nextFiles)[0] ?? CORE_ARTICLE_FILE)
							: state.activeFile,
				};
			}),
		resetWorkspace: (files) =>
			set({
				files: { ...files },
				activeFile: files[CORE_ARTICLE_FILE]
					? CORE_ARTICLE_FILE
					: (Object.keys(files)[0] ?? CORE_ARTICLE_FILE),
			}),
	}),
);
