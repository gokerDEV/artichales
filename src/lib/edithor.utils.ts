export const formatDate = (timestamp: number) => {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(timestamp));
};

export function formatBytes(bytes: number, decimals = 2): string {
	if (!+bytes) return "0 Bytes";

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function getFileExtension(filename: string): string {
	const parts = filename.split(".");
	if (parts.length === 1 || (parts[0] === "" && parts.length === 2)) {
		return "";
	}
	return parts.pop()?.toLowerCase() || "";
}

export function getEditorLanguage(
	filename: string,
): "markdown" | "json" | "bibtex" | "text" {
	const ext = getFileExtension(filename);

	switch (ext) {
		case "md":
		case "mda":
			return "markdown";
		case "json":
			return "json";
		case "bib":
		case "bibtex":
			return "bibtex";
		default:
			return "text";
	}
}

export function sanitizeFileName(name: string): string {
	return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

export function isFilePinned(
	filename: string,
	pinnedFiles: Array<{ name: string }>,
): boolean {
	return pinnedFiles.some((pinned) => pinned.name === filename);
}

export function getBaseName(filename: string): string {
	const ext = getFileExtension(filename);
	if (!ext) return filename;
	return filename.slice(0, -(ext.length + 1));
}
