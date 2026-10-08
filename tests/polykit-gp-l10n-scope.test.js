"use strict";

import assert from "node:assert/strict";
import vm from "node:vm";

function loadTranslator() {
	const location = { origin: "https://translate.wordpress.org", pathname: "/projects/example/" };
	const context = vm.createContext({
		document: { addEventListener() {} },
		window: {
			location,
			polykit_gp_strings: { "Save Settings": "設定を保存" },
		},
	});
	vm.runInContext(
		Deno.readTextFileSync(new URL("../js/polykit-gp-l10n.js", import.meta.url)),
		context,
	);
	return { context, location };
}

function element(classes = [], excluded = false) {
	return {
		closest(selector) {
			if (selector.includes("script") && excluded) return this;
			if (
				selector === ".gp-content, .site-header, .site-footer" &&
				classes.some((name) => selector.includes(`.${name}`))
			) return this;
			return null;
		},
	};
}

Deno.test("GlotPress translation includes exact URL or class and respects exclude", () => {
	const { context, location } = loadTranslator();
	const outside = element();
	const content = element(["gp-content"]);
	const header = element(["site-header"]);
	const footer = element(["site-footer"]);
	const excluded = element(["gp-content"], true);
	context.target = outside;
	assert.equal(vm.runInContext("polykit_gp_is_translation_target(target)", context), false);
	location.pathname = "/";
	assert.equal(vm.runInContext("polykit_gp_is_translation_target(target)", context), true);
	location.pathname = "/projects/example/";
	for (const allowed of [content, header, footer]) {
		context.target = allowed;
		assert.equal(vm.runInContext("polykit_gp_is_translation_target(target)", context), true);
	}
	context.target = excluded;
	assert.equal(vm.runInContext("polykit_gp_is_translation_target(target)", context), false);
});

Deno.test("GlotPress text stays unchanged outside include areas", () => {
	const { context, location } = loadTranslator();
	const textNode = { data: "Save Settings", parentElement: element() };
	context.textNode = textNode;
	vm.runInContext("polykit_gp_localize_text_node(textNode)", context);
	assert.equal(textNode.data, "Save Settings");
	textNode.parentElement = element(["gp-content"]);
	vm.runInContext("polykit_gp_localize_text_node(textNode)", context);
	assert.equal(textNode.data, "設定を保存");
	textNode.data = "Save Settings";
	textNode.parentElement = element();
	location.pathname = "/";
	vm.runInContext("polykit_gp_localize_text_node(textNode)", context);
	assert.equal(textNode.data, "設定を保存");
});

Deno.test("GlotPress attributes stay unchanged outside include areas", () => {
	const { context } = loadTranslator();
	let classes = [];
	let title = "Save Settings";
	const target = {
		...element(),
		closest(selector) {
			return element(classes).closest(selector);
		},
		matches: (selector) => selector === "[title]",
		querySelectorAll: () => [],
		getAttribute: () => title,
		setAttribute: (_name, value) => title = value,
	};
	context.target = target;
	vm.runInContext("polykit_gp_localize_attributes(target)", context);
	assert.equal(title, "Save Settings");
	classes = ["gp-content"];
	vm.runInContext("polykit_gp_localize_attributes(target)", context);
	assert.equal(title, "設定を保存");
});
