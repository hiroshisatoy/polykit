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
	const [stored, legacy] = await Promise.all([
		chrome.storage.sync.get("polykit_translate_interface"),
		chrome.storage.local.get("polykit_translate_interface"),
	]);
	const enabled = "boolean" === typeof stored.polykit_translate_interface
		? stored.polykit_translate_interface
		: "boolean" === typeof legacy.polykit_translate_interface
		? legacy.polykit_translate_interface
		: true;
	toggle.checked = enabled;
}

toggle.addEventListener("change", async () => {
	const enabled = toggle.checked;
	try {
		await chrome.storage.sync.set({ polykit_translate_interface: enabled });
	} catch (_error) {
		toggle.checked = !enabled;
		status.textContent = "設定を保存できませんでした。もう一度お試しください。";
		return;
	}
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

document.getElementById("export-settings").addEventListener("click", async () => {
	try {
		const stored = await chrome.storage.sync.get(polykitSettingsStorage.keys);
		const settings = polykitSettingsStorage.clean(stored);
		const blob = new Blob([
			JSON.stringify({ format: "polykit-settings", version: 1, settings }, null, 2),
		], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = "polykit-settings.json";
		document.body.appendChild(link);
		link.click();
		link.remove();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
		status.textContent = "設定を書き出しました。JSON ファイルを共有できます。";
	} catch (_error) {
		status.textContent = "設定を書き出せませんでした。";
	}
});

const settingsFile = document.getElementById("settings-file");
document.getElementById("import-settings").addEventListener("click", () => settingsFile.click());
settingsFile.addEventListener("change", async () => {
	const file = settingsFile.files?.[0];
	if (!file) return;
	try {
		if (file.size > 120000) throw new Error("ファイルが大きすぎます。");
		const settings = polykitSettingsStorage.parseExport(await file.text());
		const old = await chrome.storage.sync.get(polykitSettingsStorage.keys);
		const removed = polykitSettingsStorage.keys.filter((key) =>
			Object.hasOwn(old, key) && !Object.hasOwn(settings, key)
		);
		if (Object.keys(settings).length) await chrome.storage.sync.set(settings);
		if (removed.length) await chrome.storage.sync.remove(removed);
		await chrome.storage.local.set({ polykit_sync_migrated: true });
		await chrome.storage.local.remove("polykit_translate_interface");
		toggle.checked = settings.polykit_translate_interface ?? true;
		const tab = await polykit_popup_active_tab();
		if (polykit_popup_is_supported(tab)) {
			try {
				await chrome.tabs.sendMessage(tab.id, "polykit-reload-settings");
			} catch (_error) {
				// Settings will be applied on the next page load.
			}
		}
		status.textContent = "設定を読み込みました。開いている翻訳ページは再読み込みしてください。";
	} catch (error) {
		status.textContent = error.message || "設定を読み込めませんでした。";
	} finally {
		settingsFile.value = "";
	}
});

document.getElementById("open-settings").addEventListener("click", () => {
	chrome.runtime.sendMessage("polykit-open-settings-from-popup");
	window.close();
});

polykit_popup_load_setting().catch(() => {
	status.textContent = "設定を読み込めませんでした。";
});
