"use strict";

/**
 * GlotPress UI localization: replace existing English strings in the DOM.
 * Replacement map is loaded from languages/{locale}/glotpress.json (init.js).
 */

let polykit_gp_strings_sorted = null;
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
	const escaped = source
		.split(/\s+/)
		.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
		.join("\\s+");
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
		const elements = Array.from(root.querySelectorAll(selector));
		if (root.matches(selector)) {
			elements.unshift(root);
		}
		elements.forEach((element) => {
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
 * @param {Element|Document|Text} root
 * @returns {void}
 */
function polykit_localize_glotpress(root = document.body) {
	if (!root || !polykit_should_localize_glotpress()) {
		return;
	}
	if (root.nodeType === 3) {
		polykit_gp_localize_text_node(root);
		return;
	}
	if (root instanceof Element && polykit_gp_should_skip_element(root)) {
		return;
	}
	// 要素も走査し、原文・訳文などの対象外サブツリーには入らない。
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
		acceptNode(node) {
			if (node.nodeType === 1) {
				return polykit_gp_should_skip_element(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
			}
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
	const root = document.body;
	const pending = new Set();
	let timer = null;
	const options = {
		childList: true,
		subtree: true,
		characterData: true,
		attributes: true,
		attributeFilter: ["title", "aria-label", "placeholder", "value"],
	};
	const collect = (records) => {
		for (const record of records) {
			const nodes = record.type === "childList" ? record.addedNodes : [record.target];
			for (const node of nodes) {
				const element = node.nodeType === 1 ? node : node.parentElement;
				if ((node.nodeType === 1 || node.nodeType === 3) && !polykit_gp_should_skip_element(element)) {
					pending.add(node);
				}
			}
		}
	};
	const observer = new MutationObserver((records) => {
		collect(records);
		if (!pending.size || timer !== null) return;
		timer = setTimeout(() => {
			timer = null;
			collect(observer.takeRecords());
			// 自身の翻訳による変更通知を再処理しない。
			observer.disconnect();
			try {
				for (const node of pending) {
					if (!node.isConnected) continue;
					let ancestor = node.parentNode;
					while (ancestor && !pending.has(ancestor)) ancestor = ancestor.parentNode;
					if (!ancestor) polykit_localize_glotpress(node);
				}
			} finally {
				pending.clear();
				observer.observe(root, options);
			}
		}, 30);
	});
	polykit_localize_glotpress(root);
	observer.observe(root, options);
}

document.addEventListener("polykit:gp-strings-ready", () => {
	polykit_bootstrap_i18n(true);
	polykit_gp_strings_sorted = null;
	polykit_init_glotpress_l10n();
});
