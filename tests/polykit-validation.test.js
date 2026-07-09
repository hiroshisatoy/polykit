"use strict";

import assert from "node:assert/strict";
import vm from "node:vm";

const context = {
	polykit_t: (key, ...args) => [key, ...args].join("|"),
};
vm.createContext(context);
for (const file of ["polykit-locales.js", "polykit-functions.js", "polykit-validation.js"]) {
	vm.runInContext(
		Deno.readTextFileSync(new URL(`../js/${file}`, import.meta.url)),
		context,
	);
}

const entries = [
	{ term: "site", translations: ["サイト"], source: "locale" },
	{ term: "post", translations: ["投稿", "投稿する"], source: "project" },
];

function getWarnings(original, translated, skip = []) {
	return Array.from(
		context.polykit_get_custom_glossary_warnings(original, translated, entries, skip),
	);
}

Deno.test("custom glossary warnings", () => {
	assert.deepStrictEqual(getWarnings("Manage your site", "サイトを管理"), []);
	assert.deepStrictEqual(getWarnings("Manage your sites", "サイトを管理"), []);
	assert.deepStrictEqual(getWarnings("Manage your site", "ウェブを管理"), [
		"glossary_missing_custom|glossary_source_locale|site|サイト",
	]);
	assert.deepStrictEqual(getWarnings("Create a post", "記事を作成"), [
		"glossary_missing_custom|glossary_source_project|post|投稿」「投稿する",
	]);
	assert.deepStrictEqual(getWarnings("Create a post", "投稿を作成"), []);
});

Deno.test("custom glossary warnings skip marked and unrelated terms", () => {
	// GlotPress がマーク済みの用語は既存チェックに任せる。
	assert.deepStrictEqual(
		getWarnings("Manage your site", "ウェブを管理", ["Site"]),
		[],
	);
	// 原文に用語が単語として現れない場合は照合しない。
	assert.deepStrictEqual(getWarnings("Use the website", "ウェブを使う"), []);
	assert.deepStrictEqual(getWarnings("Composite view", "複合ビュー"), []);
	// URL 内の語は対象外。
	assert.deepStrictEqual(
		getWarnings("Visit site", "https://example.com/site を開く"),
		[],
	);
});
