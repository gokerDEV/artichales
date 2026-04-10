import type { Root } from "mdast";
import { create } from "zustand";
import type { ReferenceSelectorTarget, ResolvedReference } from "@/lib/article-analysis";
import type { CitationEntry, ValidatedBibEntry } from "@/lib/bibtex";
import type { AppDiagnostic, PipelineResultPayload } from "@/lib/document-pipeline";
import type { TemplateFileResolved } from "@/lib/template";

interface WorkspaceState {
	// Slice 1: Input (Read by Editor and Worker only)
	rawFiles: Record<string, string>;
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
	setRawFiles: (files) => set({ rawFiles: files }),
	updateFile: (fileName, content) =>
		set((state) => ({
			rawFiles: { ...state.rawFiles, [fileName]: content },
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
