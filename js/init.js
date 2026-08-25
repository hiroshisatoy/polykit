const jsScripts = [
	"jquery.bind-first",
	"dompurify",
	"keymaster",
	"polykit-functions",
	"polykit-i18n",
	"polykit-gp-l10n",
	"polykit-settings",
	"polykit-hotkey",
	"polykit-validation",
	"polykit-locale-validation",
	"polykit-column",
	"polykit-meta",
	"polykit-bulk",
	"polykit-notices",
	"polykit-checks",
	"polykit-search",
	"polykit-bulk-consistency",
	"polykit-consistency",
	"polykit",
];

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
	const changelog = chrome.runtime.getURL("CHANGELOG.md");
	fetch(changelog)
		.then((response) => response.text())
		.then((changelogData) => {
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
						const lastChange = changelogData.match(/(\* [\s\S]*?)(?=#)/);
						localStorage.setItem(
							"polykit_extension_status",
							JSON.stringify({
								...response,
								changelog: (null !== lastChange) ? lastChange[1] : "",
							}),
						);
					}
				},
			);
		})
		.catch(() => {
			// Changelog is optional; page scripts must still load.
		});
}

/**
 * Start PolyKit, then apply the optional GlotPress UI dictionary when ready.
 *
 * @returns {Promise<void>}
 */
async function polykit_start() {
	const shared_settings = await chrome.storage.local.get(
		"polykit_translate_interface",
	);
	if ("boolean" === typeof shared_settings.polykit_translate_interface) {
		localStorage.setItem(
			"polykit_translate_interface",
			shared_settings.polykit_translate_interface,
		);
	}
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
