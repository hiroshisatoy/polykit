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

Deno.test("glossary wave dash matches arbitrary translated text", () => {
	assert.strictEqual(
		context.polykit_glossary_translation_occurrences(
			"本当に削除してもよいですか ?",
			"本当に〜してもよいですか ?",
		),
		1,
	);
	assert.strictEqual(
		context.polykit_glossary_translation_occurrences(
			"本当に削除してもよいですか ? 本当に更新してもよいですか ?",
			"本当に〜してもよいですか ?",
		),
		2,
	);
	assert.strictEqual(
		context.polykit_glossary_translation_occurrences(
			"削除してもよいですか ?",
			"本当に〜してもよいですか ?",
		),
		0,
	);
});

Deno.test("glossary matching keeps literal behavior without a usable wildcard", () => {
	assert.strictEqual(
		context.polykit_glossary_translation_occurrences(
			"保存して保存します",
			"保存",
		),
		2,
	);
	assert.strictEqual(
		context.polykit_glossary_translation_occurrences("任意の訳文", "〜"),
		0,
	);
	assert.strictEqual(
		context.polykit_glossary_translation_occurrences("〜", "〜"),
		1,
	);
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

Deno.test("polykit_parse_json returns fallback for corrupt values", () => {
	assert.deepStrictEqual(context.polykit_parse_json(null, {}), {});
	assert.deepStrictEqual(context.polykit_parse_json("", { a: 1 }), { a: 1 });
	assert.deepStrictEqual(context.polykit_parse_json("{", { ok: false }), {
		ok: false,
	});
	assert.strictEqual(
		JSON.stringify(context.polykit_parse_json('{"a":1}')),
		'{"a":1}',
	);
	const already = { already: true };
	assert.strictEqual(context.polykit_parse_json(already), already);
});

Deno.test("polykit_glossary_consistency_url encodes the search term", () => {
	assert.strictEqual(
		context.polykit_glossary_consistency_url("foo & bar"),
		"https://translate.wordpress.org/consistency?search=foo%20%26%20bar&set=ja%2Fdefault",
	);
});

Deno.test("polykit_glossary_translation_from_data ignores missing payloads", () => {
	assert.strictEqual(context.polykit_glossary_translation_from_data(undefined), "");
	assert.strictEqual(context.polykit_glossary_translation_from_data([]), "");
	assert.strictEqual(
		context.polykit_glossary_translation_from_data([{ translation: "保存" }]),
		"保存",
	);
});

Deno.test("polykit_quicklink_hrefs_from_menu requires four menu links", () => {
	assert.strictEqual(context.polykit_quicklink_hrefs_from_menu(["a"]), null);
	assert.strictEqual(
		JSON.stringify(context.polykit_quicklink_hrefs_from_menu([
			"https://example.test/permalink",
			"https://example.test/history",
			"https://example.test/consistency",
			"https://example.test/discussion",
		])),
		JSON.stringify({
			permalink: "https://example.test/permalink",
			history: "https://example.test/history&historypage",
			consistency: "https://example.test/consistency&consistencypage",
			discussion: "https://example.test/discussion",
		}),
	);
});

Deno.test("polykit_get_visible_editor uses computed display, not style text", () => {
	const hidden = {
		classList: { contains: (name) => "editor" === name },
		style: { display: "table-row" },
	};
	const visible = {
		classList: { contains: (name) => "editor" === name },
		style: { display: "none" },
	};
	const root = {
		querySelectorAll: () => [hidden, visible],
	};
	const editor = context.polykit_get_visible_editor(root, (el) => ({
		display: el === visible ? "table-row" : "none",
		visibility: "visible",
	}));
	assert.strictEqual(editor, visible);
});

Deno.test("polykit_register_editor_added notifies callbacks", () => {
	const seen = [];
	context.polykit_register_editor_added((el) => seen.push(el));
	const editor = { id: "editor-1" };
	context.polykit_notify_editor_added(editor);
	assert.deepStrictEqual(seen, [editor]);
});

Deno.test("polykit_is_trusted_inline_tag allows only b and i", () => {
	assert.strictEqual(context.polykit_is_trusted_inline_tag("B"), true);
	assert.strictEqual(context.polykit_is_trusted_inline_tag("I"), true);
	assert.strictEqual(context.polykit_is_trusted_inline_tag("SCRIPT"), false);
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
