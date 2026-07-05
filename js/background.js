let polykit_details = {};

chrome.runtime.onInstalled.addListener((details) => {
  // 'install', 'update', 'chrome_update', or 'shared_module_update'
  polykit_details = details;
  polykit_details["currentVersion"] = chrome.runtime.getManifest().version;
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if ("polykit-status" === request) {
    sendResponse(polykit_details);
  }
  return true;
});
