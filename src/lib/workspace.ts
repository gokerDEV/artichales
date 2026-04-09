export const CORE_TEMPLATE_FILE = "template.json";
export const CORE_ARTICLE_FILE = "article.mda";
export const LEGACY_ARTICLE_FILE = "article.mdx";
export const CORE_BIB_FILE = "references.bib";

export const CORE_FILES = [
	CORE_TEMPLATE_FILE,
	CORE_ARTICLE_FILE,
	CORE_BIB_FILE,
] as const;

export const WORKSPACE_UI_STATE_KEY = "artichales-workspace-ui-state-v1";
export const WORKSPACE_STORAGE_FALLBACK_KEY = "artichales-workspace-files-v1";
export const LEGACY_WORKSPACE_AUTOSAVE_KEY = "artichales-editor-autosave";

export function orderWorkspaceFiles(files: string[]): string[] {
	return [...files].sort((a, b) => {
		const aPin = CORE_FILES.indexOf(a as (typeof CORE_FILES)[number]);
		const bPin = CORE_FILES.indexOf(b as (typeof CORE_FILES)[number]);

		if (aPin !== -1 || bPin !== -1) {
			if (aPin === -1) return 1;
			if (bPin === -1) return -1;
			return aPin - bPin;
		}
		return a.localeCompare(b);
	});
}

export function isCoreWorkspaceFile(fileName: string): boolean {
	return CORE_FILES.includes(fileName as (typeof CORE_FILES)[number]);
}
