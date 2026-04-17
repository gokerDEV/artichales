// import type * as React from "react";
//
// export type EdithorViewerMethods = {
// 	listFiles: () => string[];
// 	listAssetFiles: () => string[];
// 	readFile: (fileName: string) => string | null;
// 	readAssetText: (fileName: string) => string | null;
// 	readAssetDataUrl: (fileName: string) => string | null;
// 	readJsonAsset: <T = unknown>(
// 		fileName: string,
// 	) => {
// 		data: T;
// 		resolvedFileName: string;
// 	} | null;
// };
//
// export type EdithorViewerProps = {
// 	files: Record<string, string>;
// 	activeFile: string;
// 	methods: EdithorViewerMethods;
// };
//
// export type EdithorViewer = (props: EdithorViewerProps) => React.ReactNode;

export interface EdithorFile {
	id: string;
	name: string;
	lastModified: number;
	size?: number;
	path?: string;
	deletable: boolean;
	editable: boolean;
	pinned: boolean;
}

export interface EdithorAdapter {
	onUpload: (files: File[]) => Promise<void>;
	onDelete: (fileId: string) => Promise<void>;
	onRename: (fileId: string, newName: string) => Promise<void>;
	onSave: (fileId: string, content: string) => Promise<void>;
	onReadFile: (fileId: string) => Promise<string>;
}

export interface AutocompleteItem {
	label: string;
	detail?: string;
	insertText: string;
}

export interface AutocompleteRule {
	trigger: string | RegExp;
	provideItems: (
		query: string,
	) => Promise<AutocompleteItem[]> | AutocompleteItem[];
}

export interface EdithorConfig {
	maxUploadedFileSize?: number;
	maxFileCount?: number;
	maxWorkspaceSize?: number;
	validateFileName?: (name: string) => boolean | string;
	autocompleteRules?: AutocompleteRule[];
}

export interface EdithorProps {
	files: EdithorFile[];
	adapter: EdithorAdapter;
	config?: EdithorConfig;
	previewContent?: React.ReactNode;
	previewHeaderExtras?: React.ReactNode;
}
