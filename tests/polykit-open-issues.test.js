"use strict";

import assert from "node:assert/strict";
import vm from "node:vm";

const root = new URL("../", import.meta.url);

Deno.test("bulk replacement validates every plural form before mutation", () => {
	const context = {};
	vm.createContext(context);
	vm.runInContext(Deno.readTextFileSync(new URL("js/polykit-bulk-consistency.js", root)), context);
	const forms = [{ value: "original-one" }, { value: "original-many" }];
	context.forms = forms;
	context.replacement = ["replacement", ""];
	assert.strictEqual(
		vm.runInContext("polykit_bulk_apply_replacement(forms, replacement)", context),
		false,
	);
	assert.deepStrictEqual(forms.map((form) => form.value), ["original-one", "original-many"]);
});

Deno.test("bulk action stops retrying when the editor times out", () => {
	const scheduled = [];
	let warning_text = "";
	const context = {
		$gp: { editor: { current: null } },
		document: {
			querySelector() {
				return {
					insertAdjacentElement(_position, warning) {
						warning_text = warning.textContent;
					},
				};
			},
		},
		polykit_create_element() {
			return { textContent: "" };
		},
		polykit_t(key) {
			return key;
		},
		setTimeout(callback, delay) {
			scheduled.push({ callback, delay });
		},
		window: { close() {} },
	};
	vm.createContext(context);
	vm.runInContext(Deno.readTextFileSync(new URL("js/polykit-bulk-consistency.js", root)), context);
	vm.runInContext('polykit_bulk_gp_action("save", polykit_bulk_max_retries)', context);
	assert.strictEqual(warning_text, "bulk_editor_timeout");
	assert.deepStrictEqual(scheduled.map(({ delay }) => delay), [5000]);
});

Deno.test("input events from dynamically added textareas mark the translation as edited", () => {
	const context = {};
	vm.createContext(context);
	const source = Deno.readTextFileSync(new URL("js/polykit-checks.js", root));
	const function_source = source.match(
		/function polykit_mark_user_edited\(event\) \{[\s\S]*?\n\}/,
	);
	assert.ok(function_source);
	vm.runInContext(`let polykit_user_edited = false;\n${function_source[0]}`, context);
	context.event = {
		target: {
			matches(selector) {
				return "textarea" === selector;
			},
		},
	};
	vm.runInContext("polykit_mark_user_edited(event)", context);
	assert.strictEqual(vm.runInContext("polykit_user_edited", context), true);
});
