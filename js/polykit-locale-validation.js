"use strict";

const polykit_locale_terminology_rules = [
	{ wrong: "下さい", right: "ください" },
	{ wrong: "全て", right: "すべて" },
	{ wrong: "既に", right: "すでに" },
];

function polykit_mask_locale_text(text) {
	return text
		.replace(/<code\b[^>]*>[\s\S]*?<\/code>/gi, "\x01")
		.replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, "\x01")
		.replace(/%(\d+\$)?[sd]/g, "\x01")
		.replace(/<[^>]+>/g, "\x01")
		.replace(/https?:\/\/\S+/g, "\x01");
}

/**
 * 原文の意味に依存する、明確な訳語統一ルールを検証する。
 *
 * @param {string} original 原文。
 * @param {string} text 訳文。
 * @returns {string[]} 警告メッセージのキー。
 */
function polykit_get_source_terminology_warnings(original, text) {
	const warnings = [];

	if (
		/^\s*View(?:\s+the)?\b/i.test(original) &&
		/(?:閲覧|見る|開く|参照)/.test(text)
	) {
		warnings.push("ja_view_terminology");
	}
	if (
		/\b(?:is|are) not allowed to\b/i.test(original) &&
		!/権限がありません/.test(text)
	) {
		warnings.push("ja_not_allowed_terminology");
	}
	if (
		/^\s*Sorry(?:\b|[,.!:])/i.test(original) &&
		/^\s*(?:すみません|申し訳)/.test(text)
	) {
		warnings.push("ja_sorry_terminology");
	}

	return warnings;
}

const polykit_no_space_adjacent_chars = "『」「」。、";

/**
 * 数字とコロンを除く半角文字かどうか（1-4）。
 *
 * @param {string} ch
 * @returns {boolean}
 */
function polykit_is_halfwidth_non_digit_char(ch) {
	if (":" === ch || /[0-9]/.test(ch)) {
		return false;
	}
	return /[A-Za-z!-/;-@\[-`{-~\uFF61-\uFF9F]/.test(ch);
}

/**
 * 全角文字かどうか（1-4）。
 *
 * @param {string} ch
 * @returns {boolean}
 */
function polykit_is_fullwidth_char(ch) {
	return /[\u3040-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/.test(ch);
}

/**
 * 直前直後の文字の間にスペースが必要か（1-4）。
 *
 * @param {string} before
 * @param {string} after
 * @returns {boolean}
 */
function polykit_mixed_boundary_needs_space(before, after) {
	if (/[\s\u00A0\u3000]/.test(before) || /[\s\u00A0\u3000]/.test(after)) {
		return false;
	}
	if (
		polykit_no_space_adjacent_chars.includes(before) ||
		polykit_no_space_adjacent_chars.includes(after)
	) {
		return false;
	}
	return (polykit_is_fullwidth_char(before) &&
		polykit_is_halfwidth_non_digit_char(after)) ||
		(polykit_is_halfwidth_non_digit_char(before) &&
			polykit_is_fullwidth_char(after));
}

/**
 * 1-4 に反する、数字を除く半角文字と全角文字の境界を返す。
 * 1-9 により、半角数字の前後は検査対象に含めない。
 * コロン (:) の前後は ja_colon_spacing に任せる。
 *
 * @param {string} masked 検査対象からコードなどを除外した訳文。
 * @returns {string} 問題のある境界。該当しない場合は空文字。
 */
function polykit_get_unspaced_mixed_boundary(masked) {
	for (let i = 1; i < masked.length; i++) {
		const before = masked[i - 1];
		const after = masked[i];
		if (polykit_mixed_boundary_needs_space(before, after)) {
			return before + after;
		}
	}

	return "";
}

/**
 * 1-5: 丸括弧の外側スペース。1-6 の内側密着 (例: WordPress) は対象外。
 * 1-4: 。、」』などの直後・直前はスペース不要。
 *
 * @param {string} masked
 * @returns {boolean}
 */
function polykit_paren_needs_outside_space(masked) {
	const no_space_before_open = "。、！？；：」』』])％%「『";
	const no_space_after_close = "。、！？；：」』』[(％%「『";

	for (let i = 1; i < masked.length; i++) {
		if ("(" !== masked[i]) {
			continue;
		}
		const before = masked[i - 1];
		if (/[\s\u00A0]/.test(before) || no_space_before_open.includes(before)) {
			continue;
		}
		if (/[\u3040-\u9FFFA-Za-z0-9]/.test(before)) {
			return true;
		}
	}

	for (let i = 0; i < masked.length - 1; i++) {
		if (")" !== masked[i]) {
			continue;
		}
		const after = masked[i + 1];
		if (/[\s\u00A0]/.test(after) || no_space_after_close.includes(after)) {
			continue;
		}
		if (/[\u3040-\u9FFFA-Za-z0-9]/.test(after)) {
			return true;
		}
	}

	return false;
}

/**
 * 1-1: 日本語文脈での半角「,」「.」句読点を検出する。
 *
 * @param {string} masked
 * @returns {string} 検出した半角句読点（重複なし）。
 */
function polykit_get_halfwidth_japanese_punctuation_chars(masked) {
	const found = [];
	const cjk = /[\u3040-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/;

	if (
		cjk.test(masked) && /,/.test(masked) &&
		(/[\u3040-\u9FFF\u3400-\u4DBF\uF900-\uFAFF],/.test(masked) ||
			/,\s*[\u3040-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/.test(masked))
	) {
		found.push(",");
	}
	if (/[\u3040-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]\.(?!\d)/.test(masked)) {
		found.push(".");
	}

	return [...new Set(found)].join("");
}

/**
 * 1-7 / 1-8: 閉じ丸括弧の直前に「。」がある。
 *
 * @param {string} masked
 * @returns {boolean}
 */
function polykit_has_paren_period_before_close(masked) {
	return /\。\)/.test(masked);
}

/**
 * 日本語スタイルガイドの警告メッセージを収集する（DOM 非依存）。
 *
 * @param {string} original 原文。
 * @param {string} text 訳文。
 * @returns {string[]}
 */
function polykit_collect_locale_warnings(original, text) {
	if ("ja" !== polykit_get_lang()) {
		return [];
	}
	const warnings = [];
	const masked = polykit_mask_locale_text(text);

	if (polykit_get_setting("ja_japanese_punctuation")) {
		const punctuation = polykit_get_halfwidth_japanese_punctuation_chars(masked);
		if (punctuation) {
			warnings.push(polykit_t("ja_japanese_punctuation", punctuation));
		}
	}

	if (polykit_get_setting("ja_fullwidth_ascii")) {
		const fullwidth = masked.match(/[！-／：-＠Ａ-Ｚ［-｀ａ-ｚ｛-～]/g);
		if (fullwidth) {
			const unique = [...new Set(fullwidth)].slice(0, 5).join("");
			warnings.push(polykit_t("ja_fullwidth_ascii", unique));
		}
	}

	if (polykit_get_setting("ja_fullwidth_number")) {
		const nums = masked.match(/[０-９]+/g);
		if (nums) {
			warnings.push(polykit_t("ja_fullwidth_number", nums[0]));
		}
	}

	if (
		polykit_get_setting("ja_space_before_half") &&
		!polykit_get_setting("ja_space_around_mixed")
	) {
		const bad = masked.match(/[\u3040-\u9FFF][!?]/g);
		if (bad) {
			warnings.push(polykit_t("ja_space_before_half", bad[0]));
		}
	}

	if (polykit_get_setting("ja_space_around_mixed")) {
		const boundary = polykit_get_unspaced_mixed_boundary(masked);
		if (boundary) {
			warnings.push(polykit_t("ja_space_around_mixed", boundary));
		}
	}

	if (polykit_get_setting("ja_space_after_comma")) {
		if (/、[ \u00A0\u3000]/.test(masked)) {
			warnings.push(polykit_t("ja_space_after_comma"));
		}
	}

	if (polykit_get_setting("ja_colon_spacing")) {
		if (/[ \u00A0\u3000]:/.test(masked)) {
			warnings.push(polykit_t("ja_colon_before"));
		} else if (
			/:(?!\s)[A-Za-z\u3040-\u9FFF]/.test(masked) && !/\d:\d/.test(masked)
		) {
			warnings.push(polykit_t("ja_colon_after"));
		}
	}

	if (polykit_get_setting("ja_digit_spacing")) {
		const digit_space = masked.match(
			/\d[ \u00A0\u3000]+[件個年月日時分秒回人文字列バージョン％%]/,
		);
		if (digit_space) {
			warnings.push(polykit_t("ja_digit_spacing", digit_space[0]));
		}
	}

	if (polykit_get_setting("ja_paren_space_outside")) {
		if (polykit_paren_needs_outside_space(masked)) {
			warnings.push(polykit_t("ja_paren_space_outside"));
		}
	}

	if (polykit_get_setting("ja_paren_space_inside")) {
		if (/\(\s+|\s+\)/.test(masked)) {
			warnings.push(polykit_t("ja_paren_space_inside"));
		}
	}

	if (polykit_get_setting("ja_paren_period_before_close")) {
		if (polykit_has_paren_period_before_close(masked)) {
			warnings.push(polykit_t("ja_paren_period_before_close"));
		}
	}

	if (polykit_get_setting("ja_terminology")) {
		for (const rule of polykit_locale_terminology_rules) {
			if (rule.wrong === "下さい" && /差し下さい/.test(text)) {
				continue;
			}
			if (text.includes(rule.wrong)) {
				warnings.push(
					polykit_t("ja_terminology_wrong", rule.right, rule.wrong),
				);
			}
		}
	}

	if (
		polykit_get_setting("ja_view_terminology") ||
		polykit_get_setting("ja_not_allowed_terminology") ||
		polykit_get_setting("ja_sorry_terminology")
	) {
		for (
			const warning of polykit_get_source_terminology_warnings(original, text)
		) {
			if (!polykit_get_setting(warning)) {
				continue;
			}
			warnings.push(polykit_t(warning));
		}
	}

	if (polykit_get_setting("ja_straight_quotes")) {
		const check = text.replace(/([^>"]*)"(?=[^<]*>)/g, "$1\x01");
		if (/[\u3040-\u9FFF]"/.test(check) || /"[\u3040-\u9FFF]/.test(check)) {
			warnings.push(polykit_t("ja_straight_quotes"));
		}
	}

	return warnings;
}
