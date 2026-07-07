const jsScripts = [
	"jquery.bind-first",
	"dompurify",
	"keymaster",
	"polykit-locales",
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
	"polykit-consistency",
	"polykit",
];

/**
 * UI locale from PolyKit language picker (falls back to ja).
 *
 * @returns {string}
 */
function polykit_resolve_ui_locale() {
	const lang = localStorage.getItem("polykit_language");
	return (!lang || "" === lang) ? "ja" : lang;
}

/**
 * Load languages/{locale}/polykit.json and glotpress.json.
 *
 * @returns {Promise<void>}
 */
async function polykit_load_language_files() {
	const preferred = polykit_resolve_ui_locale();
	const locales = [preferred];
	if ("ja" !== preferred) {
		locales.push("ja");
	}
	const strings = {};
	const gp_strings = {};
	let ui_locale = "ja";

	for (const locale of locales) {
		const base = chrome.runtime.getURL(`languages/${locale}/`);
		try {
			const [polykit_response, gp_response] = await Promise.all([
				fetch(`${base}polykit.json`),
				fetch(`${base}glotpress.json`),
			]);
			if (polykit_response.ok) {
				Object.assign(strings, await polykit_response.json());
				ui_locale = locale;
			}
			if (gp_response.ok) {
				Object.assign(gp_strings, await gp_response.json());
			}
			if (polykit_response.ok) {
				break;
			}
		} catch (_error) {
			// Try next fallback locale.
		}
	}

	polykit_publish_language_data({
		polykit_strings: strings,
		polykit_gp_strings: gp_strings,
		polykit_ui_locale: ui_locale,
	});
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
 * Load extension scripts in dependency order.
 *
 * @param {string[]} urls
 * @returns {Promise<void>}
 */
async function script(urls) {
	if (Array.isArray(urls)) {
		for (const item of urls) {
			await script(item);
		}
		return;
	}
	return new Promise((resolve, reject) => {
		let r = false;
		const t = document.getElementsByTagName("script")[0];
		const s = document.createElement("script");
		s.type = "text/javascript";
		s.src = chrome.runtime.getURL(`js/${urls}.js`);
		s.async = false;
		s.onload = s.onreadystatechange = function () {
			if (!r && (!this.readyState || "complete" === this.readyState)) {
				r = true;
				resolve(this);
			}
		};
		s.onerror = s.onabort = reject;
		t.parentNode.insertBefore(s, t);
	});
}

// Get extension informations
const changelog = chrome.runtime.getURL("CHANGELOG.md");
fetch(changelog)
	.then((response) => response.text())
	.then((changelogData) => {
		chrome.runtime.sendMessage(
			"polykit-status",
			(response) => {
				const polykit_extension_storage = (null !== localStorage.getItem("polykit_extension_status"))
					? JSON.parse(localStorage.getItem("polykit_extension_status"))
					: "";
				if (
					"undefined" !== response &&
					("install" === response["reason"] ||
						"update" === response["reason"]) &&
					polykit_extension_storage.currentVersion !==
						response["currentVersion"]
				) {
					let data = {};
					data = response;
					const lastChange = changelogData.match(/(\* [\s\S]*?)(?=#)/);
					data["changelog"] = (null !== lastChange) ? lastChange[1] : "";
					localStorage.setItem(
						"polykit_extension_status",
						JSON.stringify(data),
					);
				}
			},
		);
	})
	.then(() => polykit_load_language_files())
	.then(() => script(jsScripts))
	.catch(() => polykit_load_language_files().then(() => script(jsScripts)));

// Add the icon
const t = document.getElementsByTagName("header")[0];
const s = document.createElement("img");
s.src = chrome.runtime.getURL("icons/icon-48.png");
s.style.display = "none";
s.classList.add("polykit-icon");
t.parentNode.insertBefore(s, t);
