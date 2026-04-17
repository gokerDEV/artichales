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
import type {
	WorkspaceFiles,
	WorkspaceLastModifiedMap,
} from "@/services/workspace.repository";

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
	files: WorkspaceFiles,
	lastModifiedByName: WorkspaceLastModifiedMap,
	previousEntries: WorkspaceFileEntry[],
): WorkspaceFileEntry[] {
	const previousByName = new Map(
		previousEntries.map((file) => [file.name, file]),
	);
	return Object.keys(files)
		.sort((a, b) => a.localeCompare(b))
		.map((fileName) => {
			const previous = previousByName.get(fileName);
			return {
				name: fileName,
				kind: getAssetKind(fileName),
				lastUpdated:
					lastModifiedByName[fileName] ?? previous?.lastUpdated ?? Date.now(),
			};
		});
}

interface WorkspaceState {
	// Slice 1: Input (Read by Editor and Worker only)
	rawFiles: WorkspaceFiles;
	fileLastModified: WorkspaceLastModifiedMap;
	workspaceFiles: WorkspaceFileEntry[];
	assetFiles: WorkspaceFileEntry[];
	setRawFiles: (
		files: WorkspaceFiles,
		lastModifiedByName?: WorkspaceLastModifiedMap,
	) => void;
	updateFile: (
		fileName: string,
		content: string,
		lastModified?: number,
	) => void;

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
	fileLastModified: {},
	workspaceFiles: [],
	assetFiles: [],
	setRawFiles: (files, lastModifiedByName = {}) =>
		set((state) => {
			const nextLastModified = { ...state.fileLastModified };
			const timestamp = Date.now();
			for (const fileName of Object.keys(files)) {
				nextLastModified[fileName] =
					lastModifiedByName[fileName] ??
					state.fileLastModified[fileName] ??
					timestamp;
			}
			for (const fileName of Object.keys(nextLastModified)) {
				if (!(fileName in files)) {
					delete nextLastModified[fileName];
				}
			}
			const workspaceFiles = buildWorkspaceFiles(
				files,
				nextLastModified,
				state.workspaceFiles,
			);
			return {
				rawFiles: files,
				fileLastModified: nextLastModified,
				workspaceFiles,
				assetFiles: workspaceFiles.filter((file) => isAssetFile(file.name)),
			};
		}),
	updateFile: (fileName, content, lastModified = Date.now()) =>
		set((state) => {
			const rawFiles = { ...state.rawFiles, [fileName]: content };
			const fileLastModified = {
				...state.fileLastModified,
				[fileName]: lastModified,
			};
			const workspaceFiles = buildWorkspaceFiles(
				rawFiles,
				fileLastModified,
				state.workspaceFiles,
			);
			return {
				rawFiles,
				fileLastModified,
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
