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
 * Load languages/ja/polykit.json and glotpress.json.
 *
 * @returns {Promise<void>}
 */
async function polykit_load_language_files() {
	const strings = {};
	const gp_strings = {};
	const base = chrome.runtime.getURL("languages/ja/");
	try {
		const [polykit_response, gp_response] = await Promise.all([
			fetch(`${base}polykit.json`),
			fetch(`${base}glotpress.json`),
		]);
		if (polykit_response.ok) {
			Object.assign(strings, await polykit_response.json());
		}
		if (gp_response.ok) {
			Object.assign(gp_strings, await gp_response.json());
		}
	} catch (_error) {
		// Keep empty strings; UI keys will fall back to raw keys.
	}

	polykit_publish_language_data({
		polykit_strings: strings,
		polykit_gp_strings: gp_strings,
		polykit_ui_locale: "ja",
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
	const version = chrome.runtime.getManifest().version;
	return new Promise((resolve, reject) => {
		let r = false;
		const t = document.getElementsByTagName("script")[0];
		const s = document.createElement("script");
		s.type = "text/javascript";
		s.src = chrome.runtime.getURL(`js/${urls}.js`) + `?v=${version}`;
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
				if (chrome.runtime.lastError) {
					return;
				}
				const polykit_extension_storage = (null !== localStorage.getItem("polykit_extension_status"))
					? JSON.parse(localStorage.getItem("polykit_extension_status"))
					: "";
				if (
					response &&
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
const polykit_header = document.getElementsByTagName("header")[0];
if (polykit_header) {
	const polykit_icon = document.createElement("img");
	polykit_icon.src = chrome.runtime.getURL("icons/icon-48.png");
	polykit_icon.style.display = "none";
	polykit_icon.classList.add("polykit-icon");
	polykit_header.parentNode.insertBefore(polykit_icon, polykit_header);
}
