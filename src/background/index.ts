import { runMetrics } from "@/lib/engine/plan";
import type { Extractions, Inputs } from "@/lib/types/engine";
import type {
	EXTRACT_SIGNALS_MESSAGE,
	EXTRACT_SIGNALS_RESPONSE,
	GET_CACHED_EXTRACTIONS_MESSAGE,
	GET_CACHED_EXTRACTIONS_RESPONSE,
	RUN_ANALYSIS_MESSAGE,
	RUN_ANALYSIS_RESPONSE,
} from "@/services/messaging";
import { historyService, settingsService, storage } from "@/services/storage";


const SESSION_TAB_KEY = "match_last_tab_id";

// Persist the last active browser tab ID to session storage.
// This is the only reliable way for the side panel to know which tab to
// analyse, because when the user clicks a button inside the side panel,
// the side panel window gains focus and `lastFocusedWindow` queries stop
// returning browser tabs.
const persistActiveTab = async (tabId: number) => {
	try {
		const tab = await chrome.tabs.get(tabId);
		if (tab.url?.startsWith("http")) {
			await chrome.storage.session.set({ [SESSION_TAB_KEY]: tabId });
		}
	} catch {
		// Tab may not be accessible (e.g. devtools); ignore.
	}
};

// Register the context menu entry on first install / update
chrome.runtime.onInstalled.addListener(() => {
	chrome.contextMenus.create({
		id: "open-match-sidepanel",
		title: "Check MATCH",
		contexts: ["page"],
	});
	// Do NOT open the side panel automatically when the toolbar action is clicked
	chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
});

// Track tab switches so the side panel always knows the current browser tab
chrome.tabs.onActivated.addListener(({ tabId }) => {
	persistActiveTab(tabId);
});

// Also track in-place navigations (same tab, new URL)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.status === "complete" && tab.active) {
		persistActiveTab(tabId);
	}
});

// Open the side panel when the user selects "Check MATCH" from the context menu
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
	if (info.menuItemId === "open-match-sidepanel" && tab?.id) {
		// Open first (must happen synchronously within the user gesture)
		await chrome.sidePanel.open({ tabId: tab.id });
		// Persist the tab ID after opening so the side panel can read it
		persistActiveTab(tab.id);
	}
});


// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Send EXTRACT_SIGNALS to the given tab.
 * If the content script is missing, inject it programmatically and retry once.
 */
async function extractFromTab(
	tabId: number,
): Promise<EXTRACT_SIGNALS_RESPONSE> {
	const send = () =>
		chrome.tabs.sendMessage<EXTRACT_SIGNALS_MESSAGE, EXTRACT_SIGNALS_RESPONSE>(
			tabId,
			{ type: "EXTRACT_SIGNALS" },
		);

	try {
		return await send();
	} catch {
		// Content script not present in this tab — inject it dynamically.
		const manifest = chrome.runtime.getManifest();
		const scriptFile = manifest.content_scripts?.[0]?.js?.[0];

		if (!scriptFile) {
			throw new Error("Could not find content script in manifest to inject.");
		}

		console.warn("[MATCH] Content script missing, injecting into tab", tabId);
		try {
			await chrome.scripting.executeScript({
				target: { tabId },
				files: [scriptFile],
			});
		} catch (injectErr) {
			throw new Error(
				`Cannot inject content script (restricted page?): ${injectErr instanceof Error ? injectErr.message : injectErr}`,
			);
		}

		// Give the freshly injected script time to register its message listener
		await new Promise((r) => setTimeout(r, 500));
		try {
			return await send();
		} catch (retryErr) {
			throw new Error(
				`Content script injected but still unreachable: ${retryErr instanceof Error ? retryErr.message : retryErr}`,
			);
		}
	}
}

// ── RUN_ANALYSIS handler ──────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
	(message: RUN_ANALYSIS_MESSAGE, _sender, sendResponse) => {
		if (message.type !== "RUN_ANALYSIS") return;

		(async () => {
			try {
				const settings = await settingsService.getSettings();
				const { logsEnabled } = settings;

				let targetTabId = message.payload.tabId;
				let url = message.payload.url;

				// If the caller didn't supply tab info, resolve it from the tracked tab
				if (!targetTabId || !url) {
					const tabs = await chrome.tabs.query({
						active: true,
						lastFocusedWindow: true,
					});
					const activeTab = tabs[0];
					if (!activeTab?.id || !activeTab.url) {
						throw new Error("No active tab found");
					}
					targetTabId = activeTab.id;
					url = activeTab.url;
				}

				const searchTerm = message.payload.searchTerm || "";
				const urlHash = storage.hash(url);

				const force = message.payload.force === true;
				let extractions = force
					? null
					: await storage.get<Extractions>(`ext_${urlHash}`);

				let extractionDebug: string[] = [];
				if (!extractions) {
					const response = await extractFromTab(targetTabId);

					if (!response?.success || !response.data) {
						throw new Error(
							response?.error ?? "Failed to extract signals from page.",
						);
					}

					extractionDebug = response.debug ?? [];
					if (logsEnabled && extractionDebug.length) {
						console.group("[MATCH] Extraction Debug");
						for (const line of extractionDebug) console.log(line);
						console.groupEnd();
					}

					extractions = response.data;
					await storage.set(`ext_${urlHash}`, extractions);
				}

				const inputs: Inputs = {
					url,
					searchTerm,
					timestamp: Date.now(),
				};

				const { metrics: metricsMap, logs } = await runMetrics(
					extractions,
					inputs,
				);
				const allLogs = [...extractionDebug, ...logs];

				const finalScores = [
					metricsMap.metadata_precision?.normalized ?? 0,
					metricsMap.access_quality?.normalized ?? 0,
					metricsMap.technical_hygiene?.normalized ?? 0,
					metricsMap.contextual_relevancy?.normalized ?? 0,
					metricsMap.hierarchy_integrity?.normalized ?? 0,
				];

				await historyService.addHistory(
					{
						id: Date.now().toString(36) + Math.random().toString(36).substring(2),
						url,
						searchTerm,
						timestamp: Date.now(),
						scores: finalScores,
					},
					settings.historyLimit,
				);

				await historyService.trimCache(settings.cacheLimit);

				sendResponse({
					success: true,
					scores: finalScores,
					metrics: metricsMap,
					inputs,
					logs: logsEnabled ? allLogs : [],
				} as RUN_ANALYSIS_RESPONSE);
			} catch (err: unknown) {
				console.error("[MATCH] Analysis failed:", err);
				sendResponse({
					success: false,
					error: err instanceof Error ? err.message : "Analysis failed",
				} as RUN_ANALYSIS_RESPONSE);
			}
		})();

		return true; // keep the message channel open for the async response
	},
);

// ── GET_CACHED_EXTRACTIONS handler ───────────────────────────────────────────

chrome.runtime.onMessage.addListener(
	(message: GET_CACHED_EXTRACTIONS_MESSAGE, _sender, sendResponse) => {
		if (message.type !== "GET_CACHED_EXTRACTIONS") return;

		(async () => {
			try {
				const url = message.payload.url;
				const urlHash = storage.hash(url);
				const extractions = await storage.get<Extractions>(`ext_${urlHash}`);

				if (extractions) {
					sendResponse({
						success: true,
						data: extractions,
					} as GET_CACHED_EXTRACTIONS_RESPONSE);
				} else {
					sendResponse({
						success: false,
						error: "No cached extractions found for this URL",
					} as GET_CACHED_EXTRACTIONS_RESPONSE);
				}
			} catch (err: unknown) {
				console.error("[MATCH] GET_CACHED_EXTRACTIONS failed:", err);
				sendResponse({
					success: false,
					error: err instanceof Error ? err.message : "Failed to get cached extractions",
				} as GET_CACHED_EXTRACTIONS_RESPONSE);
			}
		})();

		return true; // keep the message channel open for the async response
	},
);
