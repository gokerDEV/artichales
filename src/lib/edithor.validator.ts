import type { EdithorFile, EdithorConfig } from "@/components/edithor/types";
import { formatBytes } from "./edithor.utils";

export interface ValidationResult {
	isValid: boolean;
	error?: string;
}

const DEFAULT_CONFIG: Required<
	Omit<EdithorConfig, "autocompleteRules" | "validateFileName">
> = {
	maxUploadedFileSize: 10 * 1024 * 1024, // 10MB
	maxWorkspaceSize: 100 * 1024 * 1024, // 100MB
	maxFileCount: 50,
};

export function validateFileName(
	name: string,
	customValidator?: (name: string) => boolean | string,
): ValidationResult {
	if (!name || name.trim() === "") {
		return { isValid: false, error: "File name cannot be empty." };
	}

	if (customValidator) {
		const result = customValidator(name);
		if (typeof result === "string") {
			return { isValid: false, error: result };
		}
		if (!result) {
			return {
				isValid: false,
				error: "Invalid file name based on custom rules.",
			};
		}
		return { isValid: true };
	}

	const invalidCharsRegex = /[<>:"/\\|?*\x00-\x1F]/;
	if (invalidCharsRegex.test(name)) {
		return {
			isValid: false,
			error: "File name contains invalid characters.",
		};
	}

	if (name.length > 255) {
		return {
			isValid: false,
			error: "File name is too long (max 255 characters).",
		};
	}

	return { isValid: true };
}

export function validateFilesForUpload(
	incomingFiles: File[],
	existingFiles: EdithorFile[],
	config?: EdithorConfig,
): ValidationResult {
	if (!incomingFiles || incomingFiles.length === 0) {
		return { isValid: false, error: "No files provided for upload." };
	}

	const maxFileCount = config?.maxFileCount ?? DEFAULT_CONFIG.maxFileCount;
	const maxUploadedFileSize =
		config?.maxUploadedFileSize ?? DEFAULT_CONFIG.maxUploadedFileSize;
	const maxWorkspaceSize =
		config?.maxWorkspaceSize ?? DEFAULT_CONFIG.maxWorkspaceSize;

	if (existingFiles.length + incomingFiles.length > maxFileCount) {
		return {
			isValid: false,
			error: `Upload rejected. Maximum allowed file count is ${maxFileCount}.`,
		};
	}

	let totalIncomingSize = 0;

	for (const file of incomingFiles) {
		const nameValidation = validateFileName(
			file.name,
			config?.validateFileName,
		);
		if (!nameValidation.isValid) {
			return {
				isValid: false,
				error: `Invalid file name "${file.name}": ${nameValidation.error}`,
			};
		}

		if (file.size > maxUploadedFileSize) {
			return {
				isValid: false,
				error: `File "${file.name}" (${formatBytes(
					file.size,
				)}) exceeds the individual limit of ${formatBytes(maxUploadedFileSize)}.`,
			};
		}

		totalIncomingSize += file.size;
	}

	const currentWorkspaceSize = existingFiles.reduce(
		(total, file) => total + (file.size || 0),
		0,
	);

	if (currentWorkspaceSize + totalIncomingSize > maxWorkspaceSize) {
		return {
			isValid: false,
			error: `Upload rejected. Workspace total size limit (${formatBytes(
				maxWorkspaceSize,
			)}) would be exceeded.`,
		};
	}

	return { isValid: true };
}
