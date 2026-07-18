"use strict";

// 日本語スタイルガイド 3-6「漢字よりひらがなを使う」の代表例。
// exclude に一致する訳文はルールごとスキップする。
const polykit_locale_terminology_rules = [
	{ wrong: "下さい", right: "ください", exclude: /差し下さい/ },
	{ wrong: "全て", right: "すべて" },
	{ wrong: "既に", right: "すでに" },
	{ wrong: "更に", right: "さらに" },
	{ wrong: "但し", right: "ただし" },
	{ wrong: "予め", right: "あらかじめ" },
	{ wrong: "出来", right: "でき", exclude: /出来事|上出来|出来栄え/ },
];

// 4-1 / 4-2: 長音記号の表記（スタイルガイドの例と WordPress 用語集の定訳）。
const polykit_katakana_choon_rules = [
	{ wrong: /ユーザ(?!ー|ビリティ)/, right: "ユーザー", label: "ユーザ" },
	{ wrong: /サーバ(?!ー)/, right: "サーバー", label: "サーバ" },
	{ wrong: /コンピュータ(?!ー)/, right: "コンピューター", label: "コンピュータ" },
	{ wrong: /エディタ(?!ー)/, right: "エディター", label: "エディタ" },
	{ wrong: /フォルダ(?!ー)/, right: "フォルダー", label: "フォルダ" },
	{ wrong: /ブラウザ(?!ー)/, right: "ブラウザー", label: "ブラウザ" },
	{ wrong: /アップローダ(?!ー)/, right: "アップローダー", label: "アップローダ" },
	{ wrong: /ヘッダ(?!ー)/, right: "ヘッダー", label: "ヘッダ" },
	{ wrong: /フッタ(?!ー)/, right: "フッター", label: "フッタ" },
];

// %d 系は半角数字に置換されるため「1」として 1-9 の検査対象に含める。
// %s 系は内容が不明なため中立のセンチネルでマスクする。
function polykit_mask_locale_text(text) {
	return text
		.replace(/<code\b[^>]*>[\s\S]*?<\/code>/gi, "\x01")
		.replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, "\x01")
		.replace(/%(\d+\$)?d/g, "1")
		.replace(/%(\d+\$)?s/g, "\x01")
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
	// 丸括弧のスペースは 1-5 / 1-6 (ja_paren_space_outside / ja_paren_space_inside) に任せる。
	if ("()".includes(before) || "()".includes(after)) {
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
 * コロン (:) の前後は ja_colon_spacing に、丸括弧の前後は 1-5 / 1-6 の括弧ルールに任せる。
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
 * 日本語スタイルガイドのチェック結果を収集する（DOM 非依存）。
 * 各項目の設定（warning / notice / off）に応じて振り分ける。
 *
 * @param {string} original 原文。
 * @param {string} text 訳文。
 * @returns {{ warning: string[], notice: string[] }}
 */
function polykit_collect_locale_checks(original, text) {
	const results = { warning: [], notice: [] };
	if ("ja" !== polykit_get_lang()) {
		return results;
	}
	const masked = polykit_mask_locale_text(text);
	const push = (key, message) => {
		polykit_push_message_by_check_level(results, key, message);
	};

	if (polykit_is_check_enabled("ja_japanese_punctuation")) {
		const punctuation = polykit_get_halfwidth_japanese_punctuation_chars(masked);
		if (punctuation) {
			push(
				"ja_japanese_punctuation",
				polykit_t("ja_japanese_punctuation", punctuation),
			);
		}
	}

	if (polykit_is_check_enabled("ja_fullwidth_ascii")) {
		const fullwidth = masked.match(/[！-／：-＠Ａ-Ｚ［-｀ａ-ｚ｛-～]/g);
		if (fullwidth) {
			const unique = [...new Set(fullwidth)].slice(0, 5).join("");
			push("ja_fullwidth_ascii", polykit_t("ja_fullwidth_ascii", unique));
		}
		if (/\u3000/.test(masked)) {
			push("ja_fullwidth_ascii", polykit_t("ja_fullwidth_space"));
		}
	}

	if (polykit_is_check_enabled("ja_fullwidth_number")) {
		const nums = masked.match(/[０-９]+/g);
		if (nums) {
			push("ja_fullwidth_number", polykit_t("ja_fullwidth_number", nums[0]));
		}
	}

	if (
		polykit_is_check_enabled("ja_space_before_half") &&
		!polykit_is_check_enabled("ja_space_around_mixed")
	) {
		const bad = masked.match(/[\u3040-\u9FFF][!?]/g);
		if (bad) {
			push("ja_space_before_half", polykit_t("ja_space_before_half", bad[0]));
		}
	}

	if (polykit_is_check_enabled("ja_space_around_mixed")) {
		const boundary = polykit_get_unspaced_mixed_boundary(masked);
		if (boundary) {
			push(
				"ja_space_around_mixed",
				polykit_t("ja_space_around_mixed", boundary),
			);
		}
		// 1-4: 文字列最先頭のスペースは不要（原文自体が先頭スペースの場合を除く）。
		if (/^[ \u00A0\u3000]/.test(text) && !/^[\s\u00A0\u3000]/.test(original)) {
			push("ja_space_around_mixed", polykit_t("ja_leading_space"));
		}
	}

	if (polykit_is_check_enabled("ja_space_after_comma")) {
		if (/、[ \u00A0\u3000]/.test(masked)) {
			push("ja_space_after_comma", polykit_t("ja_space_after_comma"));
		}
	}

	if (polykit_is_check_enabled("ja_colon_spacing")) {
		if (/[ \u00A0\u3000]:/.test(masked)) {
			push("ja_colon_spacing", polykit_t("ja_colon_before"));
		} else if (
			/:(?!\s)[A-Za-z\u3040-\u9FFF]/.test(masked) && !/\d:\d/.test(masked)
		) {
			push("ja_colon_spacing", polykit_t("ja_colon_after"));
		}
	}

	if (polykit_is_check_enabled("ja_digit_spacing")) {
		// 1-9: 半角数字と全角文字の間にはスペースを入れない（前後とも）。
		const digit_space = masked.match(
			/\d[ \u00A0\u3000]+[\u3040-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/,
		) || masked.match(
			/[\u3040-\u9FFF\u3400-\u4DBF\uF900-\uFAFF][ \u00A0\u3000]+\d/,
		);
		if (digit_space) {
			push("ja_digit_spacing", polykit_t("ja_digit_spacing", digit_space[0]));
		}
	}

	if (polykit_is_check_enabled("ja_paren_space_outside")) {
		if (polykit_paren_needs_outside_space(masked)) {
			push("ja_paren_space_outside", polykit_t("ja_paren_space_outside"));
		}
	}

	if (polykit_is_check_enabled("ja_paren_space_inside")) {
		if (/\(\s+|\s+\)/.test(masked)) {
			push("ja_paren_space_inside", polykit_t("ja_paren_space_inside"));
		}
	}

	if (polykit_is_check_enabled("ja_paren_period_before_close")) {
		if (polykit_has_paren_period_before_close(masked)) {
			push(
				"ja_paren_period_before_close",
				polykit_t("ja_paren_period_before_close"),
			);
		}
	}

	if (polykit_is_check_enabled("ja_terminology")) {
		for (const rule of polykit_locale_terminology_rules) {
			if (rule.exclude && rule.exclude.test(text)) {
				continue;
			}
			if (text.includes(rule.wrong)) {
				push(
					"ja_terminology",
					polykit_t("ja_terminology_wrong", rule.right, rule.wrong),
				);
			}
		}
	}

	if (
		polykit_is_check_enabled("ja_view_terminology") ||
		polykit_is_check_enabled("ja_not_allowed_terminology") ||
		polykit_is_check_enabled("ja_sorry_terminology")
	) {
		for (
			const warning of polykit_get_source_terminology_warnings(original, text)
		) {
			if (!polykit_is_check_enabled(warning)) {
				continue;
			}
			push(warning, polykit_t(warning));
		}
	}

	if (polykit_is_check_enabled("ja_straight_quotes")) {
		const check = text.replace(/([^>"]*)"(?=[^<]*>)/g, "$1\x01");
		if (/[\u3040-\u9FFF]"/.test(check) || /"[\u3040-\u9FFF]/.test(check)) {
			push("ja_straight_quotes", polykit_t("ja_straight_quotes"));
		}
		// 2-3: “” で囲まれた語が日本語の場合は「」を使う。
		if (/[“”][^“”]*[\u3040-\u9FFF][^“”]*[“”]/.test(masked)) {
			push("ja_straight_quotes", polykit_t("ja_curly_quotes_japanese"));
		}
	}

	if (polykit_is_check_enabled("ja_katakana_choon")) {
		for (const rule of polykit_katakana_choon_rules) {
			if (rule.wrong.test(text)) {
				push(
					"ja_katakana_choon",
					polykit_t("ja_katakana_choon_wrong", rule.right, rule.label),
				);
			}
		}
	}

	if (polykit_is_check_enabled("ja_brand_names")) {
		if (/ワードプレス/.test(text)) {
			push("ja_brand_names", polykit_t("ja_brand_wordpress", "ワードプレス"));
		}
		const wrong_case = (masked.match(/wordpress/gi) || []).filter(
			(match) => "WordPress" !== match,
		);
		if (wrong_case.length) {
			push("ja_brand_names", polykit_t("ja_brand_wordpress", wrong_case[0]));
		}
	}

	// 3-1: 受動態はなるべく避ける。
	if (polykit_is_check_enabled("ja_passive_voice") && /されました/.test(text)) {
		push("ja_passive_voice", polykit_t("ja_passive_voice"));
	}

	// 3-5: 不自然な「あなた」「あなたの」を避ける。
	if (polykit_is_check_enabled("ja_avoid_anata") && /あなた/.test(text)) {
		push("ja_avoid_anata", polykit_t("ja_avoid_anata"));
	}

	// 5: カタカナ複合語の中点は原則使用しない（例外あり）。
	if (
		polykit_is_check_enabled("ja_nakaguro") &&
		/[ァ-ヶー]・[ァ-ヶー]/.test(text)
	) {
		push("ja_nakaguro", polykit_t("ja_nakaguro"));
	}

	return results;
}

/**
 * @param {string} original 原文。
 * @param {string} text 訳文。
 * @returns {string[]}
 */
function polykit_collect_locale_warnings(original, text) {
	return polykit_collect_locale_checks(original, text).warning;
}

/**
 * @param {string} original 原文。
 * @param {string} text 訳文。
 * @returns {string[]}
 */
function polykit_collect_locale_notices(original, text) {
	return polykit_collect_locale_checks(original, text).notice;
}
