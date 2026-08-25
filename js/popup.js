"use strict";

const toggle = document.getElementById("translate-interface");
const status = document.getElementById("status");

async function polykit_popup_active_tab() {
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	return tab;
}

function polykit_popup_is_supported(tab) {
	return Boolean(tab?.url?.startsWith("https://translate.wordpress.org/"));
}

async function polykit_popup_load_setting() {
	const stored = await chrome.storage.local.get("polykit_translate_interface");
	let enabled = "boolean" === typeof stored.polykit_translate_interface ? stored.polykit_translate_interface : true;
	const tab = await polykit_popup_active_tab();
	if (polykit_popup_is_supported(tab)) {
		try {
			const response = await chrome.tabs.sendMessage(
				tab.id,
				"polykit-get-translate-interface",
			);
			if ("boolean" === typeof response?.enabled) {
				enabled = response.enabled;
			}
		} catch (_error) {
			status.textContent = "ページを再読み込みすると設定が反映されます。";
		}
	}
	toggle.checked = enabled;
}

toggle.addEventListener("change", async () => {
	const enabled = toggle.checked;
	await chrome.storage.local.set({ polykit_translate_interface: enabled });
	const tab = await polykit_popup_active_tab();
	if (!polykit_popup_is_supported(tab)) {
		status.textContent = "次回 translate.wordpress.org を開いたときに反映されます。";
		return;
	}
	try {
		await chrome.tabs.sendMessage(tab.id, {
			type: "polykit-set-translate-interface",
			enabled,
		});
		status.textContent = "ページを再読み込みしています…";
	} catch (_error) {
		status.textContent = "ページを再読み込みすると設定が反映されます。";
	}
});

document.getElementById("open-settings").addEventListener("click", () => {
	chrome.runtime.sendMessage("polykit-open-settings-from-popup");
	window.close();
});

polykit_popup_load_setting();
