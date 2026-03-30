export interface CacheEntry<T> {
	timestamp: number;
	data: T;
}

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── App Settings ──────────────────────────────────────────────────────────────

export interface UXSettings {
	sidebarCollapsed: boolean;
	editorPanelSizes: number[];
}

export interface AppSettings {
	logsEnabled: boolean;
	historyLimit: number;
	cacheLimit: number;
	showCredits: boolean;
	loaderTimeout: number; // milliseconds
	ux: UXSettings;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
	logsEnabled: true,
	historyLimit: 100,
	cacheLimit: 100,
	showCredits: true,
	loaderTimeout: 3000,
	ux: {
		sidebarCollapsed: false,
		editorPanelSizes: [15, 40, 45],
	},
};

const SETTINGS_KEY = "match_settings";

// ── Cache Storage ─────────────────────────────────────────────────────────────

export const storage = {
	async get<T>(key: string): Promise<T | null> {
		return new Promise((resolve) => {
			chrome.storage.local.get(key, (result) => {
				const entry = result[key] as CacheEntry<T> | undefined;
				if (!entry) return resolve(null);

				// Check TTL
				if (Date.now() - entry.timestamp > TTL_MS) {
					chrome.storage.local.remove(key);
					return resolve(null);
				}

				resolve(entry.data);
			});
		});
	},

	async set<T>(key: string, data: T): Promise<void> {
		return new Promise((resolve) => {
			const entry: CacheEntry<T> = {
				timestamp: Date.now(),
				data,
			};
			chrome.storage.local.set({ [key]: entry }, resolve);
		});
	},

	/**
	 * Simple hash to generate consistent keys for URLs.
	 */
	hash(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = (hash << 5) - hash + str.charCodeAt(i);
			hash |= 0; // Convert to 32bit integer
		}
		return hash.toString(36);
	},
};

// ── History Service ───────────────────────────────────────────────────────────

export interface MatchHistoryItem {
	id: string;
	url: string;
	searchTerm: string;
	timestamp: number;
	scores: number[];
}

/** Unique key combining url + searchTerm for deduplication. */
function historyKey(url: string, searchTerm: string): string {
	return `${url.trim()}||${searchTerm.trim().toLowerCase()}`;
}

export const historyService = {
	async getHistory(): Promise<MatchHistoryItem[]> {
		return new Promise((resolve) => {
			chrome.storage.local.get("match_history", (res) => {
				const history = res.match_history as MatchHistoryItem[] | undefined;
				resolve(history || []);
			});
		});
	},

	/**
	 * Add or update a history item.
	 * - If an entry with the same url+searchTerm already exists, it is replaced (upsert).
	 * - The list is trimmed to `limit` items (most-recent first).
	 */
	async addHistory(item: MatchHistoryItem, limit = 100): Promise<void> {
		const list = await this.getHistory();

		// Remove any existing entry with the same url+searchTerm
		const key = historyKey(item.url, item.searchTerm);
		const deduped = list.filter((h) => historyKey(h.url, h.searchTerm) !== key);

		// Prepend the new/updated item and trim to limit
		const updated = [item, ...deduped].slice(0, limit);

		return new Promise((resolve) => {
			chrome.storage.local.set({ match_history: updated }, resolve);
		});
	},

	async deleteHistoryItem(id: string): Promise<void> {
		const list = await this.getHistory();
		const updated = list.filter((h) => h.id !== id);
		return new Promise((resolve) => {
			chrome.storage.local.set({ match_history: updated }, resolve);
		});
	},

	async clearHistory(): Promise<void> {
		return new Promise((resolve) => {
			chrome.storage.local.remove("match_history", resolve);
		});
	},

	async clearCache(): Promise<void> {
		return new Promise((resolve) => {
			chrome.storage.local.get(null, (items) => {
				const keysToRemove = Object.keys(items).filter((k) =>
					k.startsWith("ext_"),
				);
				if (keysToRemove.length > 0) {
					chrome.storage.local.remove(keysToRemove, resolve);
				} else {
					resolve();
				}
			});
		});
	},

	/**
	 * Trim cache entries (ext_*) to the most-recent `limit` items.
	 */
	async trimCache(limit: number): Promise<void> {
		return new Promise((resolve) => {
			chrome.storage.local.get(null, (items) => {
				const cacheEntries = Object.entries(items)
					.filter(([k]) => k.startsWith("ext_"))
					.map(([k, v]) => ({
						key: k,
						ts: (v as CacheEntry<unknown>).timestamp ?? 0,
					}))
					.sort((a, b) => b.ts - a.ts); // newest first

				const toRemove = cacheEntries.slice(limit).map((e) => e.key);
				if (toRemove.length > 0) {
					chrome.storage.local.remove(toRemove, resolve);
				} else {
					resolve();
				}
			});
		});
	},
};

// ── Settings Service ───────────────────────────────────────────────────────────

export const settingsService = {
	async getSettings(): Promise<AppSettings> {
		return new Promise((resolve) => {
			chrome.storage.local.get(SETTINGS_KEY, (res) => {
				const stored = res[SETTINGS_KEY] as Partial<AppSettings> | undefined;
				resolve({ ...DEFAULT_APP_SETTINGS, ...stored });
			});
		});
	},

	async updateSettings(patch: Partial<AppSettings>): Promise<void> {
		const current = await this.getSettings();
		const updated: AppSettings = {
			...current,
			...patch,
			ux: patch.ux ? { ...current.ux, ...patch.ux } : current.ux,
		};
		return new Promise((resolve) => {
			chrome.storage.local.set({ [SETTINGS_KEY]: updated }, resolve);
		});
	},
};
