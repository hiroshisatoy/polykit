"use strict";

import assert from "node:assert/strict";
import vm from "node:vm";

const strings = JSON.parse(
	Deno.readTextFileSync(new URL("../languages/ja/glotpress.json", import.meta.url)),
);
const listeners = {};
const context = {
	input: "\n\tSet / Sub Project\n",
	i18n_force: null,
	document: {
		addEventListener(name, callback) {
			listeners[name] = callback;
		},
	},
	polykit_bootstrap_i18n(force) {
		context.i18n_force = force;
	},
	polykit_get_setting() {
		return false;
	},
	window: {
		polykit_gp_strings: strings,
	},
};
vm.createContext(context);
vm.runInContext(
	Deno.readTextFileSync(new URL("../js/polykit-gp-l10n.js", import.meta.url)),
	context,
);

Deno.test("translates GlotPress UI strings", () => {
	assert.strictEqual(
		vm.runInContext("polykit_gp_translate_text( input )", context),
		"\n\tセット / サブプロジェクト\n",
	);
	context.input = "Filter ↓ • All\u00a0(26) • Translated\u00a0(26)";
	assert.strictEqual(
		vm.runInContext("polykit_gp_translate_text( input )", context),
		"フィルター ↓ • すべて\u00a0(26) • 翻訳済み\u00a0(26)",
	);
	context.input = "Search: By: Order:";
	assert.strictEqual(
		vm.runInContext("polykit_gp_translate_text( input )", context),
		"検索: 並び替え項目: 並び順:",
	);
	context.input = "Project Glossary";
	assert.strictEqual(
		vm.runInContext("polykit_gp_translate_text( input )", context),
		"プロジェクト用語集",
	);
	context.input = "Allow translation for all users";
	assert.strictEqual(
		vm.runInContext("polykit_gp_translate_text( input )", context),
		"Allow translation for all users",
	);
});

Deno.test("refreshes i18n data when asynchronous GlotPress strings are ready", () => {
	assert.strictEqual(typeof listeners["polykit:gp-strings-ready"], "function");
	listeners["polykit:gp-strings-ready"]();
	assert.strictEqual(context.i18n_force, true);
});

Deno.test("skips only the expected GlotPress elements", () => {
	context.breadcrumbChild = {
		closest(selector) {
			return selector.includes(".gp-content .breadcrumb") ? this : null;
		},
	};
	assert.strictEqual(
		vm.runInContext("polykit_gp_should_skip_element( breadcrumbChild )", context),
		true,
	);

	context.stickyHeaderChild = {
		closest(selector) {
			return selector.includes("#polykit-sticky-header") ? this : null;
		},
	};
	assert.strictEqual(
		vm.runInContext("polykit_gp_should_skip_element( stickyHeaderChild )", context),
		false,
	);
});
