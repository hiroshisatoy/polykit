"use strict";

// Shared by the popup and the content script. Page scripts use polykit:setting-changed.
const polykitSettingsStorage = (() => {
	const booleanNames = [
		"checks_enabled",
		"checks_labels",
		"checks_block_notices",
		"search_enabled",
		"translate_interface",
		"google_translate",
		"prevent_unsaved",
		"header_is_sticky",
		"bulk_consistency",
		"no_non_breaking_space",
		"autocopy_string_on_translation_opened",
		"autosubmit_bulk_copy_from_original",
		"force_autosubmit_bulk_copy_from_original",
	];
	const levelNames = [
		"check_placeholder_count",
		"check_placeholder_order",
		"check_double_spaces",
		"check_tag_spaces",
		"no_glossary_term_check",
		"no_initial_uppercase",
		"no_initial_space",
		"no_trailing_space",
		"no_final_dot",
		"no_final_other_dots",
		"ja_japanese_punctuation",
		"ja_fullwidth_ascii",
		"ja_fullwidth_number",
		"ja_space_before_half",
		"ja_space_around_mixed",
		"ja_space_after_comma",
		"ja_colon_spacing",
		"ja_digit_spacing",
		"ja_paren_space_outside",
		"ja_paren_space_inside",
		"ja_paren_period_before_close",
		"ja_terminology",
		"ja_view_terminology",
		"ja_not_allowed_terminology",
		"ja_sorry_terminology",
		"ja_straight_quotes",
		"ja_katakana_choon",
		"ja_nakaguro",
		"ja_brand_names",
		"ja_passive_voice",
		"ja_avoid_anata",
	];
	const types = Object.fromEntries([
		...booleanNames.map((name) => [`polykit_${name}`, "boolean"]),
		...levelNames.map((name) => [`polykit_${name}`, "level"]),
		["polykit_warning_words", "text"],
		["polykit_match_words", "text"],
	]);
	const keys = Object.keys(types);

	function normalize(key, value) {
		if (!Object.hasOwn(types, key)) return null;
		if ("boolean" === types[key]) {
			if (true === value || "true" === value) return true;
			if (false === value || "false" === value) return false;
			return null;
		}
		if ("level" === types[key]) {
			return ["warning", "notice", "off", "true", "false", "disabled", "nothing"]
					.includes(value)
				? value
				: null;
		}
		return "string" === typeof value &&
				new TextEncoder().encode(value).length <= 8000
			? value
			: null;
	}

	function clean(settings) {
		if (!settings || "object" !== typeof settings || Array.isArray(settings)) {
			throw new Error("設定の形式が正しくありません。");
		}
		const result = {};
		for (const [key, value] of Object.entries(settings)) {
			const normalized = normalize(key, value);
			if (null === normalized) throw new Error(`無効な設定項目: ${key}`);
			result[key] = normalized;
		}
		return result;
	}

	function mirror(settings) {
		for (const key of keys) {
			if (Object.hasOwn(settings, key)) localStorage.setItem(key, String(settings[key]));
			else localStorage.removeItem(key);
		}
	}

	function parseExport(text) {
		const data = JSON.parse(text);
		if ("polykit-settings" !== data?.format || 1 !== data.version) {
			throw new Error("PolyKit の設定ファイルではありません。");
		}
		return clean(data.settings);
	}

	return { keys, normalize, clean, mirror, parseExport };
})();
