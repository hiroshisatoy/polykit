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
