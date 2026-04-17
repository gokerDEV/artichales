import type { EdithorAdapter } from "@/components/edithor/types";
import { useWorkspaceStore } from "@/store/workspace.store";
import {
	workspaceRepository,
	validateWorkspaceAsset,
	getCoreFileNames,
} from "@/services/workspace.repository";

async function readFileContent(file: File): Promise<string> {
	if (file.type.startsWith("image/")) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = () =>
				reject(new Error(`Failed to read file: ${file.name}`));
			reader.readAsDataURL(file);
		});
	}
	return await file.text();
}

export const workspaceFileAdapter: EdithorAdapter = {
	onReadFile: async (fileId: string) => {
		const state = useWorkspaceStore.getState();
		const content = state.rawFiles[fileId];
		const lastModified = state.fileLastModified[fileId];

		if (content === undefined) {
			throw new Error(`File not found in workspace: ${fileId}`);
		}

		return {
			data: content,
			lastModified:
				typeof lastModified === "number" ? String(lastModified) : "",
		};
	},

	onSave: async (fileId: string, content: string) => {
		const store = useWorkspaceStore.getState();

		store.updateFile(fileId, content, Date.now());

		const nextState = useWorkspaceStore.getState();
		await workspaceRepository.saveWorkspace(
			nextState.rawFiles,
			nextState.fileLastModified,
		);
	},

	onDelete: async (fileId: string) => {
		const coreFiles = Object.values(getCoreFileNames());
		if (coreFiles.includes(fileId)) {
			throw new Error("Core files cannot be deleted.");
		}

		const store = useWorkspaceStore.getState();
		const rawFiles = { ...store.rawFiles };

		if (!(fileId in rawFiles)) {
			throw new Error(`File not found: ${fileId}`);
		}

		delete rawFiles[fileId];
		const nextLastModified = { ...store.fileLastModified };
		delete nextLastModified[fileId];
		store.setRawFiles(rawFiles, nextLastModified);

		await workspaceRepository.saveWorkspace(rawFiles, nextLastModified);
	},

	onRename: async (fileId: string, newName: string) => {
		const coreFiles = Object.values(getCoreFileNames());

		if (coreFiles.includes(fileId)) {
			throw new Error("Core files cannot be renamed.");
		}
		if (coreFiles.includes(newName)) {
			throw new Error("Cannot overwrite core files with a rename.");
		}

		const store = useWorkspaceStore.getState();
		const rawFiles = { ...store.rawFiles };

		if (!(fileId in rawFiles)) {
			throw new Error(`File not found: ${fileId}`);
		}
		if (newName in rawFiles) {
			throw new Error(`A file named ${newName} already exists.`);
		}

		rawFiles[newName] = rawFiles[fileId];
		delete rawFiles[fileId];

		const renamedLastModified = { ...store.fileLastModified };
		if (typeof renamedLastModified[fileId] === "number") {
			renamedLastModified[newName] = renamedLastModified[fileId];
		}
		delete renamedLastModified[fileId];

		store.setRawFiles(rawFiles, renamedLastModified);
		await workspaceRepository.saveWorkspace(rawFiles, renamedLastModified);
	},

	onUpload: async (files: File[]) => {
		const store = useWorkspaceStore.getState();
		const rawFiles = { ...store.rawFiles };
		const lastModifiedByName = { ...store.fileLastModified };

		for (const file of files) {
			const validationError = validateWorkspaceAsset(file.name, file.size);

			if (validationError) {
				throw new Error(
					`Validation failed for ${file.name}: ${validationError}`,
				);
			}

			const content = await readFileContent(file);
			rawFiles[file.name] = content;
			lastModifiedByName[file.name] = file.lastModified || Date.now();
		}

		store.setRawFiles(rawFiles, lastModifiedByName);
		await workspaceRepository.saveWorkspace(rawFiles, lastModifiedByName);
	},
};
