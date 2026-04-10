import type { Root } from "mdast";
import { create } from "zustand";
import type {
	ReferenceSelectorTarget,
	ResolvedReference,
} from "@/lib/article-analysis";
import type { CitationEntry, ValidatedBibEntry } from "@/lib/bibtex";
import type {
	AppDiagnostic,
	PipelineResultPayload,
} from "@/lib/document-pipeline";
import type { TemplateFileResolved } from "@/lib/template";
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

	// Slice 2: Processed Output (Read by root Preview components)
	ast: Root | null;
	content: string;
	frontmatter: Record<string, unknown>;
	citations: Record<string, CitationEntry>;
	validatedBibEntries: Record<string, ValidatedBibEntry>;
	plots: Record<string, unknown>;
	template: TemplateFileResolved | null;
	citationStyle: string;

	// Slice 3: Reactive Numbering (Read exclusively by Tier 1 Plugin Containers)
	referenceRegistry: Record<string, ResolvedReference>;
	referenceTargets: ReferenceSelectorTarget[];

	// Slice 4: Diagnostics & UI (Read exclusively by diagnostic panels / specific UI logic)
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

	ast: null,
	content: "",
	frontmatter: {},
	citations: {},
	validatedBibEntries: {},
	plots: {},
	template: null,
	citationStyle: "numeric",

	referenceRegistry: {},
	referenceTargets: [],

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
			ast: result.ast,
			content: result.content,
			frontmatter: result.frontmatter,
			citations: result.citations,
			validatedBibEntries: result.validatedBibEntries,
			plots: result.plots,
			template: result.template,
			citationStyle: result.citationStyle,
			referenceRegistry: result.referenceRegistry,
			referenceTargets: result.referenceTargets,
			diagnostics: result.diagnostics,
			activePluginIds: result.activePluginIds,
			isPipelineRunning: false,
		}),
}));
