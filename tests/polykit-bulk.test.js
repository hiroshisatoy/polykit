"use strict";

import assert from "node:assert/strict";
import vm from "node:vm";

Deno.test("bulk copy leaves translations unsaved even with legacy settings", () => {
	const handlers = {};
	const actions = [];
	const jQuery = (selector) => ({
		append: () => {},
		on(event, delegatedOrHandler, handler) {
			handlers[`${selector}:${event}`] = handler || delegatedOrHandler;
		},
		parent() {
			return this;
		},
		attr: () => "42",
		is: () => true,
		val: () => "copy-from-original",
		trigger: (event) => actions.push(`${selector}:${event}`),
		remove: () => {},
		before: () => {},
	});
	const context = vm.createContext({
		jQuery,
		$gp: {
			editor: {
				hide: () => actions.push("hide"),
				show: () => actions.push("show"),
			},
		},
		polykit_t: (key) => key,
		polykit_get_setting: () => assert.fail("Removed settings must not be read"),
		setTimeout: () => assert.fail("Bulk copy must not schedule a save"),
	});
	vm.runInContext(
		Deno.readTextFileSync(new URL("../js/polykit-bulk.js", import.meta.url)),
		context,
	);
	handlers["tbody th.checkbox input:change"].call({});
	let prevented = false;
	handlers[".bulk-actions:click"]({ preventDefault: () => prevented = true });
	assert.equal(prevented, true);
	assert.deepEqual(actions, [
		"hide",
		"show",
		"#editor-42 .translation-actions__copy:click",
		"#editor-42 textarea.foreign-text:change",
	]);
});
