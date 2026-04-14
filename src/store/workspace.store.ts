import { create } from "zustand";
import type { WorkspaceFileEntry } from "@/components/artichales/types/workspace.types";
import type {
	AppDiagnostic,
	ParsedArticle,
	ParsedBibliography,
	ParsedTemplate,
	PipelineResultPayload,
} from "@/lib/document-pipeline";
import {
	CORE_ARTICLE_FILE,
	CORE_BIB_FILE,
	CORE_TEMPLATE_FILE,
} from "@/lib/workspace";

function getAssetKind(fileName: string): string {
	const extension = fileName.includes(".")
		? fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase()
		: "";
	return extension || "unknown";
}

function isAssetFile(fileName: string): boolean {
	return (
		fileName !== CORE_TEMPLATE_FILE &&
		fileName !== CORE_ARTICLE_FILE &&
		fileName !== CORE_BIB_FILE
	);
}

function buildWorkspaceFiles(
	files: Record<string, string>,
	previousFiles: Record<string, string>,
	previousEntries: WorkspaceFileEntry[],
): WorkspaceFileEntry[] {
	const previousByName = new Map(
		previousEntries.map((file) => [file.name, file]),
	);
	const now = Date.now();
	return Object.keys(files)
		.sort((a, b) => a.localeCompare(b))
		.map((fileName) => {
			const previous = previousByName.get(fileName);
			const didChange = previousFiles[fileName] !== files[fileName];
			return {
				name: fileName,
				kind: getAssetKind(fileName),
				lastUpdated: previous && !didChange ? previous.lastUpdated : now,
			};
		});
}

interface WorkspaceState {
	// Slice 1: Input (Read by Editor and Worker only)
	rawFiles: Record<string, string>;
	workspaceFiles: WorkspaceFileEntry[];
	assetFiles: WorkspaceFileEntry[];
	setRawFiles: (files: Record<string, string>) => void;
	updateFile: (fileName: string, content: string) => void;

	// Slice 2: Parsed Output
	parsedTemplate: ParsedTemplate | null;
	parsedBibliography: ParsedBibliography | null;
	parsedArticle: ParsedArticle | null;

	// Slice 3: Diagnostics & UI
	diagnostics: AppDiagnostic[];
	activePluginIds: {
		parser: string[];
		core: string[];
		render: string[];
		editor: string[];
	};
	isPipelineRunning: boolean;

	// Store dispatcher
	setPipelineResult: (result: PipelineResultPayload) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()((set) => ({
	rawFiles: {},
	workspaceFiles: [],
	assetFiles: [],
	setRawFiles: (files) =>
		set((state) => {
			const workspaceFiles = buildWorkspaceFiles(
				files,
				state.rawFiles,
				state.workspaceFiles,
			);
			return {
				rawFiles: files,
				workspaceFiles,
				assetFiles: workspaceFiles.filter((file) => isAssetFile(file.name)),
			};
		}),
	updateFile: (fileName, content) =>
		set((state) => {
			const rawFiles = { ...state.rawFiles, [fileName]: content };
			const workspaceFiles = buildWorkspaceFiles(
				rawFiles,
				state.rawFiles,
				state.workspaceFiles,
			);
			return {
				rawFiles,
				workspaceFiles,
				assetFiles: workspaceFiles.filter((file) => isAssetFile(file.name)),
			};
		}),

	parsedTemplate: null,
	parsedBibliography: null,
	parsedArticle: null,

	diagnostics: [],
	activePluginIds: {
		parser: [],
		core: [],
		render: [],
		editor: [],
	},
	isPipelineRunning: false,

	setPipelineResult: (result) =>
		set({
			parsedTemplate: result.parsedTemplate,
			parsedBibliography: result.parsedBibliography,
			parsedArticle: result.parsedArticle,
			diagnostics: result.diagnostics,
			activePluginIds: result.activePluginIds,
			isPipelineRunning: false,
		}),
}));
