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

/**
 * 1-4 に反する、全角文字と半角英字の境界を返す。
 * 1-9 により、半角数字の前後は検査対象に含めない。
 *
 * @param {string} masked 検査対象からコードなどを除外した訳文。
 * @returns {string} 問題のある境界。該当しない場合は空文字。
 */
function polykit_get_unspaced_mixed_boundary(masked) {
	const patterns = [
		/[\u3040-\u9FFF\u3000-\u303F][A-Za-z]/,
		/[A-Za-z][\u3040-\u9FFF]/,
	];
	const boundary_exceptions = /[『「、。』」：]/;

	for (const pattern of patterns) {
		const match = masked.match(pattern);
		if (match && !boundary_exceptions.test(match[0])) {
			return match[0];
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

function polykit_validate_locale(e, selector, original, text, discard) {
	if ("ja" !== polykit_get_lang()) {
		return 0;
	}
	let howmany = 0;
	const masked = polykit_mask_locale_text(text);

	if (polykit_get_setting("ja_fullwidth_ascii")) {
		// 数字は 1-3 の専用警告に任せ、同じ文字への二重警告を避ける。
		const fullwidth = masked.match(/[！-／：-＠Ａ-Ｚ［-｀ａ-ｚ｛-～]/g);
		if (fullwidth) {
			const unique = [...new Set(fullwidth)].slice(0, 5).join("");
			jQuery(".textareas", selector).prepend(
				polykit_get_warning(polykit_t("ja_fullwidth_ascii", unique), discard),
			);
			howmany++;
		}
	}

	if (polykit_get_setting("ja_fullwidth_number")) {
		const nums = masked.match(/[０-９]+/g);
		if (nums) {
			jQuery(".textareas", selector).prepend(
				polykit_get_warning(polykit_t("ja_fullwidth_number", nums[0]), discard),
			);
			howmany++;
		}
	}

	if (polykit_get_setting("ja_space_before_half")) {
		// 半角文字同士 (Ready?) は 1-4 のスペース規則の対象外。
		const bad = masked.match(/[\u3040-\u9FFF」』][!?]/g);
		if (bad) {
			jQuery(".textareas", selector).prepend(
				polykit_get_warning(polykit_t("ja_space_before_half", bad[0]), discard),
			);
			howmany++;
		}
	}

	if (polykit_get_setting("ja_space_around_mixed")) {
		const boundary = polykit_get_unspaced_mixed_boundary(masked);
		if (boundary) {
			jQuery(".textareas", selector).prepend(
				polykit_get_warning(
					polykit_t("ja_space_around_mixed", boundary),
					discard,
				),
			);
			howmany++;
		}
	}

	if (polykit_get_setting("ja_space_after_comma")) {
		if (/、[ \u00A0\u3000]/.test(masked)) {
			jQuery(".textareas", selector).prepend(
				polykit_get_warning(polykit_t("ja_space_after_comma"), discard),
			);
			howmany++;
		}
	}

	if (polykit_get_setting("ja_colon_spacing")) {
		if (/[ \u00A0\u3000]:/.test(masked)) {
			jQuery(".textareas", selector).prepend(
				polykit_get_warning(polykit_t("ja_colon_before"), discard),
			);
			howmany++;
		} else if (
			/:(?!\s)[A-Za-z\u3040-\u9FFF]/.test(masked) && !/\d:\d/.test(masked)
		) {
			jQuery(".textareas", selector).prepend(
				polykit_get_warning(polykit_t("ja_colon_after"), discard),
			);
			howmany++;
		}
	}

	if (polykit_get_setting("ja_digit_spacing")) {
		const digit_space = masked.match(
			/\d[ \u00A0\u3000]+[件個年月日時分秒回人文字列バージョン％%]/,
		);
		if (digit_space) {
			jQuery(".textareas", selector).prepend(
				polykit_get_warning(
					polykit_t("ja_digit_spacing", digit_space[0]),
					discard,
				),
			);
			howmany++;
		}
	}

	if (polykit_get_setting("ja_paren_space_outside")) {
		if (polykit_paren_needs_outside_space(masked)) {
			jQuery(".textareas", selector).prepend(
				polykit_get_warning(polykit_t("ja_paren_space_outside"), discard),
			);
			howmany++;
		}
	}

	if (polykit_get_setting("ja_paren_space_inside")) {
		if (/\(\s+|\s+\)/.test(masked)) {
			jQuery(".textareas", selector).prepend(
				polykit_get_warning(polykit_t("ja_paren_space_inside"), discard),
			);
			howmany++;
		}
	}

	if (polykit_get_setting("ja_terminology")) {
		for (const rule of polykit_locale_terminology_rules) {
			if (rule.wrong === "下さい" && /差し下さい/.test(text)) {
				continue;
			}
			if (text.includes(rule.wrong)) {
				jQuery(".textareas", selector).prepend(
					polykit_get_warning(
						polykit_t("ja_terminology_wrong", rule.right, rule.wrong),
						discard,
					),
				);
				howmany++;
			}
		}
	}

	if (polykit_get_setting("ja_source_terminology")) {
		for (
			const warning of polykit_get_source_terminology_warnings(original, text)
		) {
			jQuery(".textareas", selector).prepend(
				polykit_get_warning(polykit_t(warning), discard),
			);
			howmany++;
		}
	}

	if (polykit_get_setting("ja_straight_quotes")) {
		const check = text.replace(/([^>"]*)"(?=[^<]*>)/g, "$1\x01");
		if (/[\u3040-\u9FFF]"/.test(check) || /"[\u3040-\u9FFF]/.test(check)) {
			jQuery(".textareas", selector).prepend(
				polykit_get_warning(polykit_t("ja_straight_quotes"), discard),
			);
			howmany++;
		}
	}

	if (howmany !== 0) {
		polykit_stoppropagation(e);
	}
	return howmany;
}
