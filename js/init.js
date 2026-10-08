const jsScripts = [
	"jquery.bind-first",
	"dompurify",
	"polykit-functions",
	"polykit-i18n",
	"polykit-gp-l10n",
	"polykit-settings",
	"polykit-validation",
	"polykit-locale-validation",
	"polykit-column",
	"polykit-meta",
	"polykit-bulk",
	"polykit-notices",
	"polykit-checks",
	"polykit-bulk-consistency",
	"polykit-consistency",
	"polykit",
];

function polykit_apply_modern_colors() {
	document.documentElement.classList.toggle(
		"polykit-modern-colors",
		"true" === localStorage.getItem("polykit_modern_colors"),
	);
}

polykit_apply_modern_colors();

/**
 * Persist a settings request in the shared DOM until page scripts are ready.
 *
 * @returns {void}
 */
function polykit_request_settings_panel() {
	document.documentElement.dataset.polykitOpenSettings = "true";
	document.dispatchEvent(new CustomEvent("polykit:open-settings"));
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
	if ("polykit-open-settings" === request) {
		polykit_request_settings_panel();
		return;
	}
	if ("polykit-get-translate-interface" === request) {
		sendResponse({
			enabled: "false" !== localStorage.getItem("polykit_translate_interface"),
		});
		return;
	}
	if (
		request && "polykit-set-translate-interface" === request.type &&
		"boolean" === typeof request.enabled
	) {
		localStorage.setItem("polykit_translate_interface", request.enabled);
		window.location.reload();
	}
	if ("polykit-reload-settings" === request) {
		window.location.reload();
	}
});

document.addEventListener("polykit:setting-changed", () => {
	const key = document.documentElement.dataset.polykitSettingChanged;
	const value = polykitSettingsStorage.normalize(key, localStorage.getItem(key));
	if (null !== value) {
		chrome.storage.sync.set({ [key]: value }).catch(() => {
			// The current page retains its local setting if the sync quota is reached.
		});
	}
});

if ("#polykit-settings" === window.location.hash) {
	polykit_request_settings_panel();
}

/**
 * @param {string|null} value
 * @param {*} fallback
 * @returns {*}
 */
function polykit_init_parse_json(value, fallback) {
	if (null === value || "" === value) {
		return fallback;
	}
	try {
		return JSON.parse(value);
	} catch (_error) {
		return fallback;
	}
}

/**
 * Load PolyKit's own UI strings before page scripts start.
 *
 * @returns {Promise<Record<string, string>>}
 */
async function polykit_load_polykit_strings() {
	const strings = {};
	const base = chrome.runtime.getURL("languages/ja/");
	try {
		const polykit_response = await fetch(`${base}polykit.json`);
		if (polykit_response.ok) {
			Object.assign(strings, await polykit_response.json());
		}
	} catch (_error) {
		// Keep empty strings; UI keys will fall back to raw keys.
	}
	return strings;
}

/**
 * Load GlotPress UI strings without blocking PolyKit startup.
 *
 * @returns {Promise<Record<string, string>>}
 */
async function polykit_load_glotpress_strings() {
	const strings = {};
	const base = chrome.runtime.getURL("languages/ja/");
	try {
		const response = await fetch(`${base}glotpress.json`);
		if (response.ok) {
			Object.assign(strings, await response.json());
		}
	} catch (_error) {
		// GlotPress remains in English when its optional dictionary cannot load.
	}
	return strings;
}

/**
 * Pass translation data to page scripts via a non-executable JSON script tag (CSP-safe).
 *
 * @param {Record<string, unknown>} payload
 * @returns {void}
 */
function polykit_publish_language_data(payload) {
	let element = document.getElementById("polykit-i18n-data");
	if (!element) {
		element = document.createElement("script");
		element.id = "polykit-i18n-data";
		element.type = "application/json";
		document.documentElement.appendChild(element);
	}
	element.textContent = JSON.stringify(payload);
}

/**
 * Load extension scripts. async=false keeps execution order while downloads overlap.
 *
 * @param {string[]} urls
 * @returns {Promise<void>}
 */
function script(urls) {
	const names = Array.isArray(urls) ? urls : [urls];
	const version = chrome.runtime.getManifest().version;
	const parent = document.head || document.documentElement;
	return Promise.all(names.map((name) => {
		return new Promise((resolve, reject) => {
			const s = document.createElement("script");
			s.type = "text/javascript";
			s.src = chrome.runtime.getURL(`js/${name}.js`) + `?v=${version}`;
			s.async = false;
			s.onload = () => resolve();
			s.onerror = reject;
			parent.appendChild(s);
		});
	}));
}

/**
 * Record install/update metadata without blocking page-script startup.
 *
 * @returns {void}
 */
function polykit_record_extension_status() {
	chrome.runtime.sendMessage(
		"polykit-status",
		(response) => {
			if (chrome.runtime.lastError) {
				return;
			}
			const stored = polykit_init_parse_json(
				localStorage.getItem("polykit_extension_status"),
				{},
			);
			if (
				response &&
				("install" === response.reason ||
					"update" === response.reason) &&
				stored.currentVersion !== response.currentVersion
			) {
				localStorage.setItem(
					"polykit_extension_status",
					JSON.stringify(response),
				);
			}
		},
	);
}

/**
 * Start PolyKit, then apply the optional GlotPress UI dictionary when ready.
 *
 * @returns {Promise<void>}
 */
async function polykit_sync_settings() {
	try {
		const keys = polykitSettingsStorage.keys;
		const [synced, legacy] = await Promise.all([
			chrome.storage.sync.get(keys),
			chrome.storage.local.get(["polykit_sync_migrated", "polykit_translate_interface"]),
		]);
		if (!legacy.polykit_sync_migrated) {
			const migrated = {};
			for (const key of keys) {
				if (Object.hasOwn(synced, key)) continue;
				const localValue = localStorage.getItem(key);
				const value = polykitSettingsStorage.normalize(
					key,
					"polykit_translate_interface" === key &&
						"boolean" === typeof legacy.polykit_translate_interface
						? legacy.polykit_translate_interface
						: localValue,
				);
				if (null !== value) migrated[key] = value;
			}
			if (Object.keys(migrated).length) {
				await chrome.storage.sync.set(migrated);
				Object.assign(synced, migrated);
			}
			await chrome.storage.local.set({ polykit_sync_migrated: true });
			await chrome.storage.local.remove("polykit_translate_interface");
		}
		polykitSettingsStorage.mirror(synced);
		polykit_apply_modern_colors();
	} catch (_error) {
		// Keep the existing page settings when extension storage is unavailable.
	}
}

async function polykit_start() {
	await polykit_sync_settings();
	const gp_strings_promise = polykit_load_glotpress_strings();
	const strings = await polykit_load_polykit_strings();
	polykit_publish_language_data({
		polykit_strings: strings,
		polykit_gp_strings: {},
		polykit_ui_locale: "ja",
	});
	try {
		await script(jsScripts);
	} catch (_error) {
		return;
	}

	const gp_strings = await gp_strings_promise;
	polykit_publish_language_data({
		polykit_strings: strings,
		polykit_gp_strings: gp_strings,
		polykit_ui_locale: "ja",
	});
	document.dispatchEvent(new CustomEvent("polykit:gp-strings-ready"));
}

polykit_record_extension_status();
polykit_start();
