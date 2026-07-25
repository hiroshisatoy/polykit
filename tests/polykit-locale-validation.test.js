"use strict";

import assert from "node:assert/strict";
import vm from "node:vm";

const context = {};
vm.createContext(context);
vm.runInContext(
	Deno.readTextFileSync(new URL("../js/polykit-locale-validation.js", import.meta.url)),
	context,
);

function getWarnings(original, translation) {
	return Array.from(context.polykit_get_source_terminology_warnings(original, translation));
}

Deno.test("source terminology warnings", () => {
	assert.deepStrictEqual(getWarnings("View settings", "設定を開く"), ["ja_view_terminology"]);
	assert.deepStrictEqual(getWarnings("View settings", "設定を表示"), []);
	assert.deepStrictEqual(
		getWarnings("Users are not allowed to edit.", "編集できません。"),
		["ja_not_allowed_terminology"],
	);
	assert.deepStrictEqual(
		getWarnings("Users are not allowed to edit.", "編集する権限がありません。"),
		[],
	);
	assert.deepStrictEqual(
		getWarnings("Sorry, this failed.", "申し訳ありません。失敗しました。"),
		["ja_sorry_terminology"],
	);
	assert.deepStrictEqual(getWarnings("Open settings", "設定を開く"), []);
});

function makeIntegrationContext(enabled_settings, levels = {}) {
	const integration = {
		polykit_get_lang: () => "ja",
		polykit_get_check_level: (key) => {
			if (Object.prototype.hasOwnProperty.call(levels, key)) {
				return levels[key];
			}
			return enabled_settings.includes(key) ? "warning" : "off";
		},
		polykit_is_check_enabled: (key) => {
			const level = integration.polykit_get_check_level(key);
			return "off" !== level;
		},
		polykit_push_message_by_check_level: (results, key, message) => {
			if (!message) {
				return;
			}
			const level = integration.polykit_get_check_level(key);
			if ("off" === level) {
				return;
			}
			results["notice" === level ? "notice" : "warning"].push(message);
		},
		polykit_t: (key, ...args) => [key, ...args].join("|"),
	};
	vm.createContext(integration);
	vm.runInContext(
		Deno.readTextFileSync(new URL("../js/polykit-locale-validation.js", import.meta.url)),
		integration,
	);
	return integration;
}

Deno.test("terminology rules with exclusions", () => {
	const integration = makeIntegrationContext(["ja_terminology"]);
	const collect = (text) => Array.from(integration.polykit_collect_locale_warnings("", text));
	assert.deepStrictEqual(collect("入力して下さい。"), [
		"ja_terminology_wrong|下さい|ください",
	]);
	assert.deepStrictEqual(collect("入力してください。"), []);
	assert.deepStrictEqual(collect("既に更新済みです。"), [
		"ja_terminology_wrong|既に|すでに",
	]);
	assert.deepStrictEqual(collect("編集出来ます。"), [
		"ja_terminology_wrong|出来|でき",
	]);
	assert.deepStrictEqual(collect("最近の出来事。"), []);
	assert.deepStrictEqual(collect("但し書きは有効です。"), [
		"ja_terminology_wrong|但し|ただし",
	]);
	assert.deepStrictEqual(collect("あらかじめご了承ください。"), []);
});

Deno.test("katakana choon rules (4-1 / 4-2)", () => {
	const integration = makeIntegrationContext(["ja_katakana_choon"]);
	const collect = (text) => Array.from(integration.polykit_collect_locale_warnings("", text));
	assert.deepStrictEqual(collect("ユーザ名を入力"), [
		"ja_katakana_choon_wrong|ユーザー|ユーザ",
	]);
	assert.deepStrictEqual(collect("ユーザー名を入力"), []);
	assert.deepStrictEqual(collect("ユーザビリティを改善"), []);
	assert.deepStrictEqual(collect("サーバに接続"), [
		"ja_katakana_choon_wrong|サーバー|サーバ",
	]);
	assert.deepStrictEqual(collect("エディターとフォルダー"), []);
});

Deno.test("brand names (6)", () => {
	const integration = makeIntegrationContext(["ja_brand_names"]);
	const collect = (text) => Array.from(integration.polykit_collect_locale_warnings("", text));
	assert.deepStrictEqual(collect("ワードプレスを使う"), [
		"ja_brand_wordpress|ワードプレス",
	]);
	assert.deepStrictEqual(collect("Wordpress を使う"), [
		"ja_brand_wordpress|Wordpress",
	]);
	assert.deepStrictEqual(collect("WordPress を使う"), []);
});

Deno.test("digit spacing (1-9) including %d placeholders", () => {
	const integration = makeIntegrationContext(["ja_digit_spacing"]);
	const collect = (text) => Array.from(integration.polykit_collect_locale_warnings("", text));
	assert.deepStrictEqual(collect("%d 件の投稿"), ["ja_digit_spacing|1 件"]);
	assert.deepStrictEqual(collect("%d件の投稿"), []);
	assert.deepStrictEqual(collect("バージョン 5.5"), ["ja_digit_spacing|ン 5"]);
	assert.deepStrictEqual(collect("バージョン5.5"), []);
	assert.deepStrictEqual(collect("2014年1月1日"), []);
});

Deno.test("leading space and fullwidth space (1-2 / 1-4)", () => {
	const integration = makeIntegrationContext([
		"ja_space_around_mixed",
		"ja_fullwidth_ascii",
	]);
	const collect = (text, original = "Original") =>
		Array.from(integration.polykit_collect_locale_warnings(original, text));
	assert.deepStrictEqual(collect(" 設定を開く"), ["ja_leading_space"]);
	assert.deepStrictEqual(collect(" 設定を開く", " Original"), []);
	assert.deepStrictEqual(collect("設定　を開く"), ["ja_fullwidth_space"]);
	assert.deepStrictEqual(collect("設定を開く"), []);
	assert.deepStrictEqual(collect("約10分～20分"), []);
	assert.deepStrictEqual(collect("設定をＯＮにする"), ["ja_fullwidth_ascii|ＯＮ"]);
});

Deno.test("curly double quotes around Japanese (2-3)", () => {
	const integration = makeIntegrationContext(["ja_straight_quotes"]);
	const collect = (text) => Array.from(integration.polykit_collect_locale_warnings("", text));
	assert.deepStrictEqual(collect("“設定”を開く"), ["ja_curly_quotes_japanese"]);
	assert.deepStrictEqual(collect("“Press This” を開く"), []);
});

Deno.test("locale notices (3-1 / 3-5 / 5)", () => {
	const integration = makeIntegrationContext([], {
		ja_passive_voice: "notice",
		ja_avoid_anata: "notice",
		ja_nakaguro: "notice",
	});
	const collect = (text) => Array.from(integration.polykit_collect_locale_notices("", text));
	assert.deepStrictEqual(collect("設定が更新されました。"), ["ja_passive_voice"]);
	assert.deepStrictEqual(collect("設定を更新しました。"), []);
	assert.deepStrictEqual(collect("あなたのサイト"), ["ja_avoid_anata"]);
	assert.deepStrictEqual(collect("テキスト・エディター"), ["ja_nakaguro"]);
	assert.deepStrictEqual(collect("お使いのサイト"), []);
});

Deno.test("locale check level can move notice items to warning", () => {
	const integration = makeIntegrationContext([], {
		ja_passive_voice: "warning",
	});
	const result = integration.polykit_collect_locale_checks(
		"",
		"設定が更新されました。",
	);
	assert.deepStrictEqual(Array.from(result.warning), ["ja_passive_voice"]);
	assert.deepStrictEqual(Array.from(result.notice), []);
});

Deno.test("locale validation helpers", () => {
	assert.strictEqual(
		context.polykit_mask_locale_text("日本語<code>Ａ?</code>WordPress"),
		"日本語\x01WordPress",
	);
	assert.strictEqual(context.polykit_mask_locale_text("%d件の投稿"), "1件の投稿");
	assert.strictEqual(
		context.polykit_mask_locale_text("%1$s を確認"),
		"\x01 を確認",
	);
	assert.strictEqual(
		context.polykit_get_unspaced_mixed_boundary("主な理由は2つあります:"),
		"",
	);
	assert.strictEqual(
		context.polykit_get_unspaced_mixed_boundary("2件のエラー"),
		"",
	);
	assert.strictEqual(
		context.polykit_get_unspaced_mixed_boundary("WordPressの使い方"),
		"sの",
	);
	assert.strictEqual(
		context.polykit_get_unspaced_mixed_boundary("WordPress の使い方"),
		"",
	);
	assert.strictEqual(
		context.polykit_get_unspaced_mixed_boundary("こんにちは、username さん。"),
		"",
	);
	assert.strictEqual(
		context.polykit_get_unspaced_mixed_boundary("こんにちは、usernameさん。"),
		"eさ",
	);
	assert.strictEqual(
		context.polykit_get_unspaced_mixed_boundary("準備ができましたか?"),
		"か?",
	);
	assert.strictEqual(
		context.polykit_get_unspaced_mixed_boundary("準備ができましたか ?"),
		"",
	);
	// 1-6: 丸括弧の内側は密着が正しいので 1-4 の対象にしない。
	assert.strictEqual(
		context.polykit_get_unspaced_mixed_boundary("(例: WordPress) を選択"),
		"",
	);
	assert.strictEqual(
		context.polykit_get_unspaced_mixed_boundary("ファイル)"),
		"",
	);
	assert.strictEqual(
		context.polykit_get_unspaced_mixed_boundary("(ファイル"),
		"",
	);
	assert.strictEqual(
		context.polykit_get_halfwidth_japanese_punctuation_chars("こんにちは,世界。"),
		",",
	);
	assert.strictEqual(
		context.polykit_get_halfwidth_japanese_punctuation_chars("完了しました."),
		".",
	);
	assert.strictEqual(
		context.polykit_get_halfwidth_japanese_punctuation_chars("バージョン5.5です。"),
		"",
	);
	assert.strictEqual(
		context.polykit_has_paren_period_before_close("(例: WordPress)。"),
		false,
	);
	assert.strictEqual(
		context.polykit_has_paren_period_before_close("(例: WordPress。)"),
		true,
	);
	assert.strictEqual(
		context.polykit_get_unspaced_mixed_boundary("ユーザー ID: username"),
		"",
	);
	assert.strictEqual(
		context.polykit_mixed_boundary_needs_space("ー", "I"),
		true,
	);
	assert.strictEqual(
		context.polykit_mixed_boundary_needs_space("、", "u"),
		false,
	);
	assert.strictEqual(
		context.polykit_mixed_boundary_needs_space("s", "の"),
		true,
	);
});
