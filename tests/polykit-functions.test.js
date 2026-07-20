"use strict";

import assert from "node:assert/strict";
import vm from "node:vm";

const context = {};
vm.createContext(context);
vm.runInContext(
	Deno.readTextFileSync(new URL("../js/polykit-functions.js", import.meta.url)),
	context,
);

Deno.test("sanitize_value strips html comments", () => {
	assert.strictEqual(
		context.sanitize_value("ja<!-- evil -->"),
		"ja",
	);
	assert.strictEqual(context.sanitize_value("ja"), "ja");
	assert.strictEqual(context.sanitize_value(42), 42);
});

Deno.test("polykit_occurrences counts case-insensitive occurrences", () => {
	assert.strictEqual(context.polykit_occurrences("WordPress と wordpress", "wordpress"), 2);
	assert.strictEqual(context.polykit_occurrences("設定を表示", "表示"), 1);
	assert.strictEqual(context.polykit_occurrences("設定を開く", "表示"), 0);
});

Deno.test("polykit_is_uppercase", () => {
	assert.strictEqual(context.polykit_is_uppercase("A"), true);
	assert.strictEqual(context.polykit_is_uppercase("a"), false);
	assert.strictEqual(context.polykit_is_uppercase("あ"), false);
});

Deno.test("polykit_check_for_URL detects terms inside URLs", () => {
	assert.strictEqual(
		context.polykit_check_for_URL(
			"plugins",
			"https://example.com/wp-content/plugins/foo を参照",
		),
		true,
	);
	assert.strictEqual(
		context.polykit_check_for_URL("plugins", "プラグインを有効化します。"),
		false,
	);
	assert.strictEqual(context.polykit_check_for_URL("", "text"), false);
});

Deno.test("polykit_get_lang is fixed to Japanese", () => {
	assert.strictEqual(context.polykit_get_lang(), "ja");
	assert.strictEqual(context.polykit_get_lang_consistency(), "ja");
	assert.strictEqual(
		context.polykit_get_global_glossary_url(),
		"https://translate.wordpress.org/locale/ja/default/glossary/",
	);
});
