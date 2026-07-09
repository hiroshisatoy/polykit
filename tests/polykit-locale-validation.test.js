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

Deno.test("terminology rules with exclusions", () => {
	const integration = {
		polykit_get_lang: () => "ja",
		polykit_get_setting: (key) => "ja_terminology" === key,
		polykit_t: (key, ...args) => [key, ...args].join("|"),
	};
	vm.createContext(integration);
	vm.runInContext(
		Deno.readTextFileSync(new URL("../js/polykit-locale-validation.js", import.meta.url)),
		integration,
	);
	const collect = (text) => Array.from(integration.polykit_collect_locale_warnings("", text));
	assert.deepStrictEqual(collect("入力して下さい。"), [
		"ja_terminology_wrong|ください|下さい",
	]);
	assert.deepStrictEqual(collect("入力してください。"), []);
	assert.deepStrictEqual(collect("既に更新済みです。"), [
		"ja_terminology_wrong|すでに|既に",
	]);
	assert.deepStrictEqual(collect("編集出来ます。"), [
		"ja_terminology_wrong|でき|出来",
	]);
	assert.deepStrictEqual(collect("最近の出来事。"), []);
	assert.deepStrictEqual(collect("但し書きは有効です。"), [
		"ja_terminology_wrong|ただし|但し",
	]);
	assert.deepStrictEqual(collect("あらかじめご了承ください。"), []);
});

Deno.test("locale validation helpers", () => {
	assert.strictEqual(
		context.polykit_mask_locale_text("日本語<code>Ａ?</code>WordPress"),
		"日本語\x01WordPress",
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
