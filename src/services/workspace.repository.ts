import {
	CORE_ARTICLE_FILE,
	CORE_BIB_FILE,
	CORE_FILES,
	CORE_TEMPLATE_FILE,
	LEGACY_ARTICLE_FILE,
	LEGACY_WORKSPACE_AUTOSAVE_KEY,
	WORKSPACE_STORAGE_FALLBACK_KEY,
} from "@/lib/workspace";

type WorkspaceFiles = Record<string, string>;

const WORKSPACE_DIRECTORY = "artichales-workspace-v1";

type FileSystemDirectoryHandleWithRemove = FileSystemDirectoryHandle & {
	removeEntry?: (
		name: string,
		options?: { recursive?: boolean },
	) => Promise<void>;
	entries?: () => AsyncIterableIterator<[string, FileSystemHandle]>;
};

function canUseOpfs(): boolean {
	return (
		typeof navigator !== "undefined" &&
		typeof navigator.storage !== "undefined" &&
		typeof navigator.storage.getDirectory === "function"
	);
}

async function getWorkspaceDirectory(): Promise<FileSystemDirectoryHandle | null> {
	if (!canUseOpfs()) return null;
	try {
		const root = await navigator.storage.getDirectory();
		return await root.getDirectoryHandle(WORKSPACE_DIRECTORY, { create: true });
	} catch {
		return null;
	}
}

async function readWorkspaceFromOpfs(): Promise<WorkspaceFiles | null> {
	const directory = await getWorkspaceDirectory();
	if (!directory) return null;

	const files: WorkspaceFiles = {};
	const directoryEntries = directory as FileSystemDirectoryHandleWithRemove;
	if (!directoryEntries.entries) return files;
	for await (const [name, handle] of directoryEntries.entries()) {
		if (handle.kind !== "file") continue;
		const fileHandle = handle as FileSystemFileHandle;
		const file = await fileHandle.getFile();
		files[name] = await file.text();
	}

	return files;
}

async function writeWorkspaceToOpfs(files: WorkspaceFiles): Promise<boolean> {
	const directory = await getWorkspaceDirectory();
	if (!directory) return false;

	for (const [name, content] of Object.entries(files)) {
		const handle = await directory.getFileHandle(name, { create: true });
		const writable = await handle.createWritable();
		await writable.write(content);
		await writable.close();
	}

	const staleCandidates: string[] = [];
	const directoryEntries = directory as FileSystemDirectoryHandleWithRemove;
	if (directoryEntries.entries) {
		for await (const [name, handle] of directoryEntries.entries()) {
			if (handle.kind !== "file") continue;
			if (!(name in files)) staleCandidates.push(name);
		}
	}

	const removableDirectory = directoryEntries;
	for (const staleName of staleCandidates) {
		if (typeof removableDirectory.removeEntry === "function") {
			await removableDirectory.removeEntry(staleName);
		}
	}

	return true;
}

function readWorkspaceFromFallbackStorage(): WorkspaceFiles | null {
	try {
		const stored = localStorage.getItem(WORKSPACE_STORAGE_FALLBACK_KEY);
		if (!stored) return null;
		const parsed = JSON.parse(stored) as WorkspaceFiles;
		return typeof parsed === "object" && parsed !== null ? parsed : null;
	} catch {
		return null;
	}
}

function writeWorkspaceToFallbackStorage(files: WorkspaceFiles): void {
	localStorage.setItem(WORKSPACE_STORAGE_FALLBACK_KEY, JSON.stringify(files));
}

function readLegacyWorkspace(): WorkspaceFiles | null {
	try {
		const stored = localStorage.getItem(LEGACY_WORKSPACE_AUTOSAVE_KEY);
		if (!stored) return null;
		const parsed = JSON.parse(stored) as WorkspaceFiles;
		return typeof parsed === "object" && parsed !== null ? parsed : null;
	} catch {
		return null;
	}
}

function normalizeWorkspaceFiles(
	files: WorkspaceFiles,
	defaultFiles: WorkspaceFiles,
): WorkspaceFiles {
	const normalized: WorkspaceFiles = { ...defaultFiles, ...files };
	const legacyArticle = normalized[LEGACY_ARTICLE_FILE];

	if (!normalized[CORE_ARTICLE_FILE] && typeof legacyArticle === "string") {
		normalized[CORE_ARTICLE_FILE] = legacyArticle;
	}

	delete normalized[LEGACY_ARTICLE_FILE];

	for (const coreFile of CORE_FILES) {
		if (typeof normalized[coreFile] !== "string") {
			normalized[coreFile] = defaultFiles[coreFile] ?? "";
		}
	}

	return normalized;
}

class WorkspaceRepository {
	async loadWorkspace(defaultFiles: WorkspaceFiles): Promise<WorkspaceFiles> {
		const opfsFiles = await readWorkspaceFromOpfs();
		const fallbackFiles = readWorkspaceFromFallbackStorage();
		const legacyFiles = readLegacyWorkspace();

		const candidate = opfsFiles ??
			fallbackFiles ??
			legacyFiles ?? { ...defaultFiles };
		const normalized = normalizeWorkspaceFiles(candidate, defaultFiles);
		await this.saveWorkspace(normalized);
		return normalized;
	}

	async saveWorkspace(files: WorkspaceFiles): Promise<void> {
		const normalized = normalizeWorkspaceFiles(files, files);
		const savedToOpfs = await writeWorkspaceToOpfs(normalized);
		if (!savedToOpfs) {
			writeWorkspaceToFallbackStorage(normalized);
		}
	}
}

export const workspaceRepository = new WorkspaceRepository();

export const WORKSPACE_FILE_LIMITS = {
	maxDefaultBytes: 2 * 1024 * 1024,
	maxHardBytes: 20 * 1024 * 1024,
};

export const WORKSPACE_ALLOWED_ASSET_EXTENSIONS = new Set([
	".json",
	".svg",
	".png",
	".jpg",
	".jpeg",
	".gif",
]);

export function validateWorkspaceAsset(
	fileName: string,
	sizeInBytes: number,
	maxFileSizeOverride?: number,
): string | null {
	const lower = fileName.toLowerCase();
	const extension = lower.includes(".")
		? lower.slice(lower.lastIndexOf("."))
		: "";
	if (
		!WORKSPACE_ALLOWED_ASSET_EXTENSIONS.has(extension) &&
		!CORE_FILES.includes(fileName as (typeof CORE_FILES)[number])
	) {
		return `Unsupported file type: ${extension || "unknown"}.`;
	}

	const appliedMax = Math.min(
		Math.max(maxFileSizeOverride ?? WORKSPACE_FILE_LIMITS.maxDefaultBytes, 1),
		WORKSPACE_FILE_LIMITS.maxHardBytes,
	);
	if (sizeInBytes > appliedMax) {
		return `File exceeds size limit (${Math.round(appliedMax / (1024 * 1024))}MB).`;
	}

	return null;
}

export function getCoreFileNames(): {
	template: string;
	article: string;
	bibliography: string;
} {
	return {
		template: CORE_TEMPLATE_FILE,
		article: CORE_ARTICLE_FILE,
		bibliography: CORE_BIB_FILE,
	};
}
