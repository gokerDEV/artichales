import { create } from "zustand";
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

type WorkspaceAssetFile = {
	name: string;
	kind: string;
	lastUpdated: number;
};

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

function buildAssetFiles(
	files: Record<string, string>,
	previousFiles: Record<string, string>,
	previousAssets: WorkspaceAssetFile[],
): WorkspaceAssetFile[] {
	const previousByName = new Map(
		previousAssets.map((asset) => [asset.name, asset]),
	);
	return Object.keys(files)
		.filter(isAssetFile)
		.sort((a, b) => a.localeCompare(b))
		.map((fileName) => {
			const previous = previousByName.get(fileName);
			const didChange = previousFiles[fileName] !== files[fileName];
			return {
				name: fileName,
				kind: getAssetKind(fileName),
				lastUpdated: previous && !didChange ? previous.lastUpdated : Date.now(),
			};
		});
}

interface WorkspaceState {
	// Slice 1: Input (Read by Editor and Worker only)
	rawFiles: Record<string, string>;
	assetFiles: WorkspaceAssetFile[];
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
	assetFiles: [],
	setRawFiles: (files) =>
		set((state) => ({
			rawFiles: files,
			assetFiles: buildAssetFiles(files, state.rawFiles, state.assetFiles),
		})),
	updateFile: (fileName, content) =>
		set((state) => ({
			rawFiles: { ...state.rawFiles, [fileName]: content },
			assetFiles: buildAssetFiles(
				{ ...state.rawFiles, [fileName]: content },
				state.rawFiles,
				state.assetFiles,
			),
		})),

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
