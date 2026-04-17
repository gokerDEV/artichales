import {
	CORE_ARTICLE_FILE,
	CORE_BIB_FILE,
	CORE_FILES,
	CORE_TEMPLATE_FILE,
	LEGACY_ARTICLE_FILE,
} from "@/lib/workspace";

export type WorkspaceFiles = Record<string, string>;
export type WorkspaceLastModifiedMap = Record<string, number>;

export interface WorkspaceSnapshot {
	files: WorkspaceFiles;
	lastModifiedByName: WorkspaceLastModifiedMap;
}

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

async function readWorkspaceFromOpfs(): Promise<WorkspaceSnapshot | null> {
	const directory = await getWorkspaceDirectory();
	if (!directory) return null;

	const files: WorkspaceFiles = {};
	const lastModifiedByName: WorkspaceLastModifiedMap = {};
	const directoryEntries = directory as FileSystemDirectoryHandleWithRemove;
	if (!directoryEntries.entries) return { files, lastModifiedByName };
	for await (const [name, handle] of directoryEntries.entries()) {
		if (handle.kind !== "file") continue;
		const fileHandle = handle as FileSystemFileHandle;
		const file = await fileHandle.getFile();
		files[name] = await file.text();
		lastModifiedByName[name] = file.lastModified;
	}

	return { files, lastModifiedByName };
}

async function writeWorkspaceToOpfs(files: WorkspaceFiles): Promise<boolean> {
	const directory = await getWorkspaceDirectory();
	if (!directory) return false;

	const existingFiles = new Map<string, string>();
	const staleCandidates: string[] = [];
	const directoryEntries = directory as FileSystemDirectoryHandleWithRemove;
	if (directoryEntries.entries) {
		for await (const [name, handle] of directoryEntries.entries()) {
			if (handle.kind !== "file") continue;
			if (!(name in files)) {
				staleCandidates.push(name);
				continue;
			}
			const fileHandle = handle as FileSystemFileHandle;
			const file = await fileHandle.getFile();
			existingFiles.set(name, await file.text());
		}
	}

	for (const [name, content] of Object.entries(files)) {
		if (existingFiles.get(name) === content) continue;
		const handle = await directory.getFileHandle(name, { create: true });
		const writable = await handle.createWritable();
		await writable.write(content);
		await writable.close();
	}

	const removableDirectory = directoryEntries;
	for (const staleName of staleCandidates) {
		if (typeof removableDirectory.removeEntry === "function") {
			await removableDirectory.removeEntry(staleName);
		}
	}

	return true;
}

function normalizeWorkspaceSnapshot(
	snapshot: WorkspaceSnapshot,
	defaultFiles: WorkspaceFiles,
): WorkspaceSnapshot {
	const normalizedFiles: WorkspaceFiles = {
		...defaultFiles,
		...snapshot.files,
	};
	const normalizedLastModifiedByName: WorkspaceLastModifiedMap = {
		...snapshot.lastModifiedByName,
	};
	const now = Date.now();
	const legacyArticle = normalizedFiles[LEGACY_ARTICLE_FILE];

	if (
		!normalizedFiles[CORE_ARTICLE_FILE] &&
		typeof legacyArticle === "string"
	) {
		normalizedFiles[CORE_ARTICLE_FILE] = legacyArticle;
		if (
			typeof normalizedLastModifiedByName[LEGACY_ARTICLE_FILE] === "number" &&
			typeof normalizedLastModifiedByName[CORE_ARTICLE_FILE] !== "number"
		) {
			normalizedLastModifiedByName[CORE_ARTICLE_FILE] =
				normalizedLastModifiedByName[LEGACY_ARTICLE_FILE];
		}
	}

	delete normalizedFiles[LEGACY_ARTICLE_FILE];
	delete normalizedLastModifiedByName[LEGACY_ARTICLE_FILE];

	for (const coreFile of CORE_FILES) {
		if (typeof normalizedFiles[coreFile] !== "string") {
			normalizedFiles[coreFile] = defaultFiles[coreFile] ?? "";
		}
		if (typeof normalizedLastModifiedByName[coreFile] !== "number") {
			normalizedLastModifiedByName[coreFile] = now;
		}
	}

	for (const fileName of Object.keys(normalizedFiles)) {
		if (typeof normalizedLastModifiedByName[fileName] !== "number") {
			normalizedLastModifiedByName[fileName] = now;
		}
	}

	return {
		files: normalizedFiles,
		lastModifiedByName: normalizedLastModifiedByName,
	};
}

class WorkspaceRepository {
	async loadWorkspace(
		defaultFiles: WorkspaceFiles,
	): Promise<WorkspaceSnapshot> {
		const opfsSnapshot = await readWorkspaceFromOpfs();

		const candidate =
			opfsSnapshot ??
			({
				files: { ...defaultFiles },
				lastModifiedByName: {},
			} satisfies WorkspaceSnapshot);
		const normalized = normalizeWorkspaceSnapshot(candidate, defaultFiles);
		try {
			await this.saveWorkspace(normalized.files);
		} catch {
			// Workspace can still be opened in-memory; save errors are surfaced by caller.
		}
		return normalized;
	}

	async saveWorkspace(files: WorkspaceFiles): Promise<void> {
		const normalized = normalizeWorkspaceSnapshot(
			{ files, lastModifiedByName: {} },
			files,
		);
		const savedToOpfs = await writeWorkspaceToOpfs(normalized.files);
		if (!savedToOpfs) {
			throw new Error("OPFS is unavailable. Workspace save failed.");
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
