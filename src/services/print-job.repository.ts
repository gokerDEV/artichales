import type { PrintJob } from "@/types/print-job";

const PRINT_JOB_KEY_PREFIX = "artichales:print-job:";
const PRINT_JOB_INDEX_KEY = "artichales:print-job:index";
const PRINT_JOB_TTL_MS = 15 * 60 * 1000;

const isExtension =
	typeof chrome !== "undefined" && typeof chrome.storage?.local !== "undefined";

function createJobId(): string {
	if (
		typeof crypto !== "undefined" &&
		typeof crypto.randomUUID === "function"
	) {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getStorageKey(jobId: string): string {
	return `${PRINT_JOB_KEY_PREFIX}${jobId}`;
}

async function storageGet<T>(key: string): Promise<T | null> {
	if (isExtension) {
		const result = await chrome.storage.local.get(key);
		return (result[key] as T) ?? null;
	}
	const raw = localStorage.getItem(key);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}

async function storageSet<T>(key: string, value: T): Promise<void> {
	if (isExtension) {
		await chrome.storage.local.set({ [key]: value });
		return;
	}
	localStorage.setItem(key, JSON.stringify(value));
}

async function storageRemove(key: string): Promise<void> {
	if (isExtension) {
		await chrome.storage.local.remove(key);
		return;
	}
	localStorage.removeItem(key);
}

async function listJobIds(): Promise<string[]> {
	const ids = await storageGet<string[]>(PRINT_JOB_INDEX_KEY);
	return Array.isArray(ids) ? ids : [];
}

async function saveJobIds(ids: string[]): Promise<void> {
	await storageSet(PRINT_JOB_INDEX_KEY, ids);
}

async function upsertJobId(jobId: string): Promise<void> {
	const ids = await listJobIds();
	if (ids.includes(jobId)) return;
	ids.push(jobId);
	await saveJobIds(ids);
}

async function removeJobId(jobId: string): Promise<void> {
	const ids = await listJobIds();
	const next = ids.filter((id) => id !== jobId);
	if (next.length === ids.length) return;
	await saveJobIds(next);
}

class PrintJobRepository {
	async createPrintJob(
		files: Record<string, string>,
		options?: PrintJob["options"],
	): Promise<PrintJob> {
		const id = createJobId();
		const job: PrintJob = {
			id,
			createdAt: Date.now(),
			target: "print",
			files: { ...files },
			options: {
				autoPrint: options?.autoPrint ?? true,
			},
		};
		await storageSet(getStorageKey(id), job);
		await upsertJobId(id);
		await this.cleanupExpiredJobs();
		return job;
	}

	async readPrintJob(id: string): Promise<PrintJob | null> {
		if (!id) return null;
		const job = await storageGet<PrintJob>(getStorageKey(id));
		if (!job) return null;
		if (Date.now() - job.createdAt > PRINT_JOB_TTL_MS) {
			await this.deletePrintJob(id);
			return null;
		}
		return job;
	}

	async readPrintJobResult(id: string): Promise<
		| { ok: true; job: PrintJob; state: "created" | "consumed" }
		| {
				ok: false;
				state:
					| "missing_job_id"
					| "not_found"
					| "expired"
					| "storage_unavailable";
		  }
	> {
		if (!id || id.trim() === "") {
			return { ok: false, state: "missing_job_id" };
		}
		try {
			const key = getStorageKey(id);
			const existing = await storageGet<PrintJob>(key);
			if (!existing) {
				return { ok: false, state: "not_found" };
			}
			if (Date.now() - existing.createdAt > PRINT_JOB_TTL_MS) {
				await this.deletePrintJob(id);
				return { ok: false, state: "expired" };
			}
			const consumedMarker = await storageGet<boolean>(`${key}:consumed`);
			if (!consumedMarker) {
				await storageSet(`${key}:consumed`, true);
			}
			return {
				ok: true,
				job: existing,
				state: consumedMarker ? "consumed" : "created",
			};
		} catch {
			return { ok: false, state: "storage_unavailable" };
		}
	}

	async deletePrintJob(id: string): Promise<void> {
		if (!id) return;
		await storageRemove(getStorageKey(id));
		await storageRemove(`${getStorageKey(id)}:consumed`);
		await removeJobId(id);
	}

	async cleanupExpiredJobs(): Promise<void> {
		const ids = await listJobIds();
		if (ids.length === 0) return;
		const now = Date.now();
		const stale: string[] = [];

		for (const id of ids) {
			const job = await storageGet<PrintJob>(getStorageKey(id));
			if (!job || now - job.createdAt > PRINT_JOB_TTL_MS) {
				stale.push(id);
			}
		}

		if (stale.length === 0) return;
		for (const id of stale) {
			await storageRemove(getStorageKey(id));
			await storageRemove(`${getStorageKey(id)}:consumed`);
		}
		await saveJobIds(ids.filter((id) => !stale.includes(id)));
	}
}

export const printJobRepository = new PrintJobRepository();
