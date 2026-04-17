chrome.runtime.onInstalled.addListener(() => {
	// Reserved for future extension initialization.
});

chrome.action.onClicked.addListener(async () => {
	const extensionUrl = chrome.runtime.getURL("app.html");

	const tabs = await chrome.tabs.query({});
	const existingTab = tabs.find((t) => t.url === extensionUrl);

	if (existingTab) {
		chrome.tabs.update(existingTab.id, { active: true });
		chrome.windows.update(existingTab.windowId, { focused: true });
	} else {
		chrome.tabs.create({ url: extensionUrl });
	}
});
// Helper to wrap chrome.debugger.attach in a Promise
function attachDebugger(target: chrome.debugger.Debuggee): Promise<void> {
	return new Promise((resolve, reject) => {
		chrome.debugger.attach(target, "1.3", () => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
			} else {
				resolve();
			}
		});
	});
}

// Helper to wrap chrome.debugger.sendCommand in a Promise
function sendCommand(
	target: chrome.debugger.Debuggee,
	method: string,
	commandParams?: any,
): Promise<any> {
	return new Promise((resolve, reject) => {
		chrome.debugger.sendCommand(target, method, commandParams, (result) => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
			} else {
				resolve(result);
			}
		});
	});
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.type === "GENERATE_SILENT_PDF" && sender.tab?.id) {
		const tabId = sender.tab.id;
		const filename = message.filename || "document.pdf";
		const target = { tabId };

		// Using an async IIFE to handle the promises inside the listener
		(async () => {
			try {
				await attachDebugger(target);

				const result = await sendCommand(target, "Page.printToPDF", {
					printBackground: true,
					preferCSSPageSize: true, // Let Paged.js define the page size
					marginTop: 0,
					marginBottom: 0,
					marginLeft: 0,
					marginRight: 0,
				});

				chrome.debugger.detach(target);

				if (!result || !result.data) {
					throw new Error("No PDF data returned from CDP.");
				}

				const pdfDataUrl = `data:application/pdf;base64,${result.data}`;

				chrome.downloads.download(
					{
						url: pdfDataUrl,
						filename: filename,
						saveAs: false, // Save silently
					},
					() => {
						// Close the background renderer tab when done
						chrome.tabs.remove(tabId);
					},
				);
			} catch (error) {
				console.error("Silent PDF Generation Failed:", error);
				chrome.debugger.detach(target).catch(() => {});
				chrome.tabs.remove(tabId).catch(() => {});
			}
		})();

		// Return true to indicate we will send a response asynchronously
		return true;
	}
});
