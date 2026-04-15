import type * as React from "react";

export type EdithorViewerMethods = {
	listFiles: () => string[];
	listAssetFiles: () => string[];
	readFile: (fileName: string) => string | null;
	readAssetText: (fileName: string) => string | null;
	readAssetDataUrl: (fileName: string) => string | null;
	readJsonAsset: <T = unknown>(
		fileName: string,
	) => {
		data: T;
		resolvedFileName: string;
	} | null;
};

export type EdithorViewerProps = {
	files: Record<string, string>;
	activeFile: string;
	methods: EdithorViewerMethods;
};

export type EdithorViewer = (props: EdithorViewerProps) => React.ReactNode;
