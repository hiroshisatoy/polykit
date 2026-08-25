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
	context.input = "Find your locale";
	assert.strictEqual(
		vm.runInContext("polykit_gp_translate_text( input )", context),
		"ロケールを探す",
	);
	context.input = "Contribute Translation";
	assert.strictEqual(
		vm.runInContext("polykit_gp_translate_text( input )", context),
		"翻訳に貢献",
	);
	context.input = "Consistency";
	assert.strictEqual(
		vm.runInContext("polykit_gp_translate_text( input )", context),
		"一貫性",
	);
	context.input =
		"Translations for the readme are published almost immediately. The initial language pack for the plugin will be generated when 90% of the";
	assert.strictEqual(
		vm.runInContext("polykit_gp_translate_text( input )", context),
		"readme の翻訳はほぼ即時に公開されます。プラグインの初回言語パックは、",
	);
	context.input =
		"Translations for the readme are published almost immediately.\n\t\t\tThe initial language pack for the plugin will be generated when 90% of the";
	assert.strictEqual(
		vm.runInContext("polykit_gp_translate_text( input )", context),
		"readme の翻訳はほぼ即時に公開されます。プラグインの初回言語パックは、",
	);
	context.input = "Stable (latest release)";
	assert.strictEqual(
		vm.runInContext("polykit_gp_translate_text( input )", context),
		"安定版 (最新リリース)",
	);
	context.input = "Stable Readme (latest release)";
	assert.strictEqual(
		vm.runInContext("polykit_gp_translate_text( input )", context),
		"安定版 readme (最新リリース)",
	);
	context.input = "Development (trunk)";
	assert.strictEqual(
		vm.runInContext("polykit_gp_translate_text( input )", context),
		"開発版 (trunk)",
	);
	context.input = "Development Readme (trunk)";
	assert.strictEqual(
		vm.runInContext("polykit_gp_translate_text( input )", context),
		"開発版 readme (trunk)",
	);
	context.input = "sub-project strings have been translated (currently 0%).";
	assert.strictEqual(
		vm.runInContext("polykit_gp_translate_text( input )", context),
		"サブプロジェクトの翻訳率が90%に達すると生成されます (現在 0%)。",
	);
	context.input = "Search locales...";
	assert.strictEqual(
		vm.runInContext("polykit_gp_translate_text( input )", context),
		"ロケールを検索…",
	);
	context.input = "If your locale isn’t below, follow the steps in the";
	assert.strictEqual(
		vm.runInContext("polykit_gp_translate_text( input )", context),
		"お探しのロケールが以下にない場合は、",
	);
	context.input = "to contribute a new locale.";
	assert.strictEqual(
		vm.runInContext("polykit_gp_translate_text( input )", context),
		"の手順に従って新しいロケールを申請してください。",
	);
	context.input =
		"Contribute to WordPress core, themes, and plugins by translating them into your language.\nSelect your locale below to get started.";
	assert.strictEqual(
		vm.runInContext("polykit_gp_translate_text( input )", context),
		"WordPress コア、テーマ、プラグインをあなたの言語に翻訳して貢献しましょう。\n始めるには、以下からロケールを選択してください。",
	);
	context.input = "Allow translation for all users";
	assert.strictEqual(
		vm.runInContext("polykit_gp_translate_text( input )", context),
		"Allow translation for all users",
	);
});

Deno.test("translates the user settings interface", () => {
	context.input = "Your Settings";
	assert.strictEqual(
		vm.runInContext("polykit_gp_translate_text( input )", context),
		"設定",
	);
	context.input = "Save Settings";
	assert.strictEqual(
		vm.runInContext("polykit_gp_translate_text( input )", context),
		"設定を保存",
	);
	context.input = "Default Sort By: Date added (original)";
	assert.strictEqual(
		vm.runInContext("polykit_gp_translate_text( input )", context),
		"デフォルトの並び替え項目: 追加日 (原文)",
	);
	context.input = "939 OpenAI translations used: 565 with modifications and 374 without modifications.";
	assert.strictEqual(
		vm.runInContext("polykit_gp_translate_text( input )", context),
		"939 OpenAI 翻訳の利用数: 565 件は修正あり、 374 件は修正なし。",
	);
	context.input = "Hide the validation top bar in the translation editor";
	assert.strictEqual(
		vm.runInContext("polykit_gp_translate_text( input )", context),
		"翻訳エディター上部の検証バーを非表示",
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
