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

Deno.test("alternates a stable plugin translation page title", () => {
	const document = {
		title: "Translations < Japanese < Stable",
		querySelectorAll() {
			return [{
				getAttribute: () => "/projects/wp-plugins/akismet/",
				textContent: "Akismet Anti-spam: Spam Protection",
			}];
		},
	};
	let callback;
	const timer = context.polykit_start_alternating_plugin_title(
		document,
		{
			pathname: "/projects/wp-plugins/akismet/stable/ja/default/",
		},
		(next_callback, delay) => {
			assert.strictEqual(delay, 3000);
			callback = next_callback;
			return 42;
		},
	);

	assert.strictEqual(timer, 42);
	callback();
	assert.strictEqual(
		document.title,
		"Akismet Anti-spam: Spam Protection (Stable)",
	);
	callback();
	assert.strictEqual(document.title, "Translations < Japanese < Stable");
});

Deno.test("uses Dev for development plugin translation pages", () => {
	const document = {
		title: "Translations < Japanese < Development",
		querySelectorAll() {
			return [{
				getAttribute: () => "/projects/wp-plugins/example/",
				textContent: "Example Plugin",
			}];
		},
	};
	let callback;
	context.polykit_start_alternating_plugin_title(
		document,
		{
			pathname: "/projects/wp-plugins/example/dev/ja/default/",
		},
		(next_callback) => {
			callback = next_callback;
			return 1;
		},
	);

	callback();
	assert.strictEqual(document.title, "Example Plugin (Dev)");
});

Deno.test("maps readme translation channels to Stable or Dev", () => {
	for (
		const [project, channel] of [
			["stable-readme", "Stable"],
			["dev-readme", "Dev"],
		]
	) {
		const document = {
			title: "Translations",
			querySelectorAll: () => [{
				getAttribute: () => "/projects/wp-plugins/example/",
				textContent: "Example Plugin",
			}],
		};
		let callback;
		context.polykit_start_alternating_plugin_title(
			document,
			{
				pathname: `/projects/wp-plugins/example/${project}/ja/default/`,
			},
			(next_callback) => {
				callback = next_callback;
				return 1;
			},
		);

		callback();
		assert.strictEqual(document.title, `Example Plugin (${channel})`);
	}
});

Deno.test("does not change titles outside plugin translation pages", () => {
	const document = {
		title: "Projects",
		querySelectorAll: () => [],
	};
	const timer = context.polykit_start_alternating_plugin_title(
		document,
		{ pathname: "/projects/wp-themes/twentytwenty/stable/ja/default/" },
		() => {
			throw new Error("timer should not start");
		},
	);

	assert.strictEqual(timer, null);
	assert.strictEqual(document.title, "Projects");
});
