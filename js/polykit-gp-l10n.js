"use strict";

/**
 * GlotPress UI localization: replace existing English strings in the DOM.
 * Replacement map is loaded from languages/{locale}/glotpress.json (init.js).
 */

let polykit_gp_strings_sorted = null;
let polykit_gp_l10n_timer = null;
let polykit_gp_l10n_initialized = false;

const polykit_gp_skip_selector = [
	"script",
	"style",
	"textarea",
	"code",
	"tr.preview .original",
	"tr.preview .translation",
	".editor .original",
	".editor .original-raw",
	".foreign-text",
	".translation-suggestion__translation",
	".translation-suggestion__translation-raw",
	".translation-suggestion__original-diff",
	".gp-content .breadcrumb",
	".project-top",
	"#glossary tbody",
	".polykit-settings",
	"#polykit-i18n-data",
	"#polykit-notices-container",
	"[data-polykit-no-l10n]",
].join(", ");

/**
 * @returns {boolean}
 */
function polykit_should_localize_glotpress() {
	if (!polykit_get_setting("translate_interface")) {
		return false;
	}
	const gp_strings = window.polykit_gp_strings || {};
	return "ja" === polykit_get_lang() && Object.keys(gp_strings).length > 0;
}

/**
 * @param {string} source
 * @returns {RegExp}
 */
function polykit_gp_create_string_pattern(source) {
	const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const word_character = /[\p{L}\p{N}_]/u;
	const start_boundary = word_character.test(source[0]) ? "(?<![\\p{L}\\p{N}_])" : "";
	const end_boundary = word_character.test(source[source.length - 1]) ? "(?![\\p{L}\\p{N}_])" : "";
	return new RegExp(`${start_boundary}${escaped}${end_boundary}`, "gu");
}

/**
 * @returns {Array<[RegExp, string]>}
 */
function polykit_gp_get_sorted_strings() {
	if (!polykit_gp_strings_sorted) {
		const map = window.polykit_gp_strings || {};
		polykit_gp_strings_sorted = Object.entries(map)
			.sort((a, b) => b[0].length - a[0].length)
			.map(([source, target]) => [polykit_gp_create_string_pattern(source), target]);
	}
	return polykit_gp_strings_sorted;
}

/**
 * @param {string} text
 * @returns {string}
 */
function polykit_gp_translate_text(text) {
	if (!text || !text.trim()) {
		return text;
	}
	let translated = text;
	polykit_gp_get_sorted_strings().forEach(([pattern, target]) => {
		translated = translated.replace(pattern, () => target);
	});
	return translated;
}

/**
 * @param {Element} element
 * @returns {boolean}
 */
function polykit_gp_should_skip_element(element) {
	if (!element) {
		return true;
	}
	if (element.closest(".suggestions-wrapper")) {
		return Boolean(element.closest(
			".translation-suggestion__translation, .translation-suggestion__translation-raw, .translation-suggestion__original-diff",
		));
	}
	return Boolean(element.closest(polykit_gp_skip_selector));
}

/**
 * @param {Text} textNode
 * @returns {void}
 */
function polykit_gp_localize_text_node(textNode) {
	const parent = textNode.parentElement;
	if (!parent || polykit_gp_should_skip_element(parent)) {
		return;
	}
	const translated = polykit_gp_translate_text(textNode.data);
	if (translated !== textNode.data) {
		textNode.data = translated;
	}
}

/**
 * @param {Element} root
 * @returns {void}
 */
function polykit_gp_localize_attributes(root) {
	const attribute_targets = [
		['input[type="submit"], input[type="button"], button', "value"],
		["input, textarea", "placeholder"],
		["[title]", "title"],
		["[aria-label]", "aria-label"],
	];
	attribute_targets.forEach(([selector, attribute]) => {
		root.querySelectorAll(selector).forEach((element) => {
			if (polykit_gp_should_skip_element(element)) {
				return;
			}
			const current = element.getAttribute(attribute);
			if (!current) {
				return;
			}
			const translated = polykit_gp_translate_text(current);
			if (translated !== current) {
				element.setAttribute(attribute, translated);
			}
		});
	});
}

/**
 * @param {Element|Document} root
 * @returns {void}
 */
function polykit_localize_glotpress(root = document.body) {
	if (!polykit_should_localize_glotpress()) {
		return;
	}
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
		acceptNode(node) {
			if (!node.data || !node.data.trim()) {
				return NodeFilter.FILTER_REJECT;
			}
			return polykit_gp_should_skip_element(node.parentElement)
				? NodeFilter.FILTER_REJECT
				: NodeFilter.FILTER_ACCEPT;
		},
	});
	let textNode = walker.nextNode();
	while (textNode) {
		polykit_gp_localize_text_node(textNode);
		textNode = walker.nextNode();
	}
	if (root instanceof Element) {
		polykit_gp_localize_attributes(root);
	} else {
		const gp_content = document.querySelector(".gp-content");
		polykit_gp_localize_attributes(gp_content || document.body);
	}
}

/**
 * @returns {void}
 */
function polykit_init_glotpress_l10n() {
	if (polykit_gp_l10n_initialized || !polykit_should_localize_glotpress()) {
		return;
	}
	polykit_gp_l10n_initialized = true;
	const run = () => {
		clearTimeout(polykit_gp_l10n_timer);
		polykit_gp_l10n_timer = setTimeout(() => polykit_localize_glotpress(), 30);
	};
	const run_now = () => polykit_localize_glotpress();
	run_now();
	if ("complete" === document.readyState) {
		setTimeout(run_now, 100);
		setTimeout(run_now, 500);
	} else {
		window.addEventListener("load", () => {
			run_now();
			setTimeout(run_now, 100);
		}, { once: true });
	}
	const root = document.querySelector(".gp-content") || document.body;
	const observer = new MutationObserver(run);
	observer.observe(root, {
		childList: true,
		subtree: true,
		characterData: true,
	});
	jQuery(document).ajaxComplete(run);
}

document.addEventListener("polykit:gp-strings-ready", () => {
	polykit_bootstrap_i18n(true);
	polykit_gp_strings_sorted = null;
	polykit_init_glotpress_l10n();
});
