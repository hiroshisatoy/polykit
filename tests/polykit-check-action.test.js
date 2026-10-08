import assert from "node:assert/strict";
import vm from "node:vm";

Deno.test("check results leave the Details action untouched", () => {
	class Element {
		classList = { add() {} };
		append() {}
		appendChild() {}
	}
	const addedClasses = [];
	const preview = {
		classList: { remove() {}, add: (value) => addedClasses.push(value) },
		querySelector() {
			assert.fail("The Details action must not be queried");
		},
		querySelectorAll: () => [],
	};
	const editor = { querySelector: () => null };
	const context = {
		HTMLElement: Element,
		document: { createElement: () => new Element(), createTextNode: (text) => text },
		polykit_create_element: () => new Element(),
		polykit_t: (key) => key,
		localStorage: { getItem: () => null },
		polykit_get_setting: () => false,
		polykit_update_check_filters: () => {},
	};
	vm.createContext(context);
	vm.runInContext(Deno.readTextFileSync(new URL("../js/polykit-checks.js", import.meta.url)), context);
	context.polykit_query_selector_safe = (selector) => selector === "#preview" ? preview : editor;
	context.polykit_update_check_filters = () => {};
	context.polykit_display_check_results("#editor", "#preview", {
		preview_class: "polykit-has-check-passed",
		ignore_status: "none",
		labels: [],
		highlights: [],
	});
	assert.deepEqual(addedClasses, ["polykit-has-check-passed"]);
});
