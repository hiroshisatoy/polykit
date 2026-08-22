"use strict";

/**
 * PolyKit UI strings from languages/{locale}/polykit.json (published by init.js).
 * GlotPress native UI uses languages/{locale}/glotpress.json via polykit-gp-l10n.js.
 */

/**
 * Read translation payloads from #polykit-i18n-data (shared DOM, CSP-safe).
 *
 * @param {boolean} force Refresh already initialized data.
 * @returns {void}
 */
function polykit_bootstrap_i18n(force = false) {
	if (
		!force && window.polykit_strings && Object.keys(window.polykit_strings).length > 0
	) {
		return;
	}
	const element = document.getElementById("polykit-i18n-data");
	if (!element || !element.textContent) {
		return;
	}
	try {
		const data = JSON.parse(element.textContent);
		window.polykit_strings = data.polykit_strings || {};
		window.polykit_gp_strings = data.polykit_gp_strings || {};
		window.polykit_ui_locale = data.polykit_ui_locale || "ja";
	} catch (_error) {
		window.polykit_strings = window.polykit_strings || {};
		window.polykit_gp_strings = window.polykit_gp_strings || {};
	}
}

polykit_bootstrap_i18n();

function polykit_t(key, ...args) {
	let text = (window.polykit_strings || {})[key] || key;
	args.forEach((arg) => {
		text = text.replace("%s", arg).replace("%d", arg);
	});
	return text;
}
