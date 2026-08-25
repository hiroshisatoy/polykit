// MV3 のサービスワーカーは随時停止されるため、インストール情報は storage.session に保持する。
chrome.runtime.onInstalled.addListener((details) => {
	// 'install', 'update', 'chrome_update', or 'shared_module_update'
	const polykit_details = { ...details };
	polykit_details["currentVersion"] = chrome.runtime.getManifest().version;
	chrome.storage.session.set({ polykit_details });
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
	if ("polykit-status" === request) {
		chrome.storage.session.get("polykit_details").then((data) => {
			sendResponse(data.polykit_details || {});
		});
		return true;
	}
});

/**
 * Open PolyKit settings in a supported tab or create one.
 *
 * @param {chrome.tabs.Tab} tab
 * @returns {void}
 */
function polykit_open_settings_from_action(tab) {
	const settings_url = "https://translate.wordpress.org/#polykit-settings";
	if (
		tab.id && tab.url &&
		tab.url.startsWith("https://translate.wordpress.org/")
	) {
		chrome.tabs.sendMessage(tab.id, "polykit-open-settings", () => {
			if (chrome.runtime.lastError) {
				chrome.tabs.create({ url: settings_url });
			}
		});
		return;
	}
	chrome.tabs.create({ url: settings_url });
}

chrome.runtime.onMessage.addListener((request) => {
	if ("polykit-open-settings-from-popup" !== request) {
		return;
	}
	chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
		polykit_open_settings_from_action(tab || {});
	});
});
