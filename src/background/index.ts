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
