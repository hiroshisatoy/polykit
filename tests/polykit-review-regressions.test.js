import assert from "node:assert/strict";
import vm from "node:vm";

function load(file, overrides = {}) {
	class Element {
		textContent = "";
		classList = { add() {} };
		append() {}
		appendChild() {}
	}
	const context = {
		HTMLElement: Element,
		document: { createElement: () => new Element(), createTextNode: (text) => text },
		polykit_create_element: () => new Element(),
		polykit_t: (key) => key,
		localStorage: { getItem: () => null },
		...overrides,
	};
	vm.createContext(context);
	vm.runInContext(Deno.readTextFileSync(new URL(`../js/${file}.js`, import.meta.url)), context);
	return context;
}

Deno.test("bulk replacement rejects invalid payloads without modifying any form", () => {
	const context = load("polykit-bulk-consistency");
	for (const replacement of [null, {}, [], ["one"], ["one", null], ["one", 2], ["one", "  "], ["one", ,]]) {
		const forms = [{ value: "before-one" }, { value: "before-many" }];
		assert.equal(context.polykit_bulk_apply_replacement(forms, replacement), false);
		assert.deepEqual(forms.map((form) => form.value), ["before-one", "before-many"]);
	}
	assert.equal(context.polykit_bulk_apply_replacement([], []), false);
	const forms = [{ value: "before" }];
	assert.equal(context.polykit_bulk_apply_replacement(forms, [" after "]), true);
	assert.equal(forms[0].value, " after ");
});

Deno.test("bulk tools initialize once after asynchronous permission discovery", () => {
	let initialized = 0;
	const user = { is_gte: false };
	const location = { href: "https://translate.wordpress.org/consistency/?search=test" };
	const context = load("polykit-bulk-consistency", {
		polykit_user: user,
		polykit_get_setting: () => true,
		window: { location },
		document: { location },
	});
	context.polykit_bulk_consistency_page = () => initialized++;
	context.polykit_bulk_consistency_init();
	assert.equal(initialized, 0);
	user.is_gte = true;
	context.polykit_bulk_consistency_init();
	context.polykit_bulk_consistency_init();
	assert.equal(initialized, 1);
});

Deno.test("word counts ignore surrounding whitespace and handle line breaks", () => {
	const context = load("polykit-meta");
	for (const [text, words] of [["", 0], [" \n\t ", 0], [" a  b\nc ", 3], ["日本語", 1]]) {
		const result = context.polykit_text_counts(text);
		assert.equal(result.characters, text.length);
		assert.equal(result.words, words);
	}
});

Deno.test("disabled double-space check produces no notices or highlights", () => {
	const context = load("polykit-checks", {
		polykit_get_check_level: () => "off",
		polykit_get_setting: () => true,
		polykit_get_text_setting: () => "",
	});
	for (const [original, translated] of [["a  b", "a b"], ["a b", "a  b"]]) {
		const result = context.polykit_run_extra_checks(original, translated);
		assert.equal(result.warning.length, 0);
		assert.equal(result.notice.length, 0);
		assert.equal(result.highlight_me.length, 0);
	}
});

Deno.test("batch review updates totals once after processing all rows", () => {
	const context = load("polykit-checks");
	const rows = Array.from({ length: 100 }, (_, i) => ({ id: i, classList: { contains: () => false } }));
	context.document.querySelectorAll = () => rows;
	context.polykit_translation_row_selector = (row, kind) => `#${kind}-${row.id}`;
	context.polykit_editor_checks_init = () => {};
	context.polykit_prepare_row_checks = () => ({});
	context.polykit_get_setting = () => true;
	let displayed = 0;
	let updates = 0;
	context.polykit_display_check_results = (_editor, _preview, _state, update) => {
		assert.equal(update, false);
		displayed++;
	};
	context.polykit_update_check_filters = () => {
		assert.equal(displayed, 100);
		updates++;
	};
	context.polykit_check_all_translations();
	assert.equal(updates, 1);
});

Deno.test("consistency fetch handles HTTP and network failures", async () => {
	const parsed = {};
	const context = load("polykit-consistency", {
		fetch: async () => ({ ok: false, text: () => assert.fail("Must not parse error response") }),
		DOMParser: class {
			parseFromString(text, type) {
				assert.equal(text, "page");
				assert.equal(type, "text/html");
				return parsed;
			}
		},
	});
	assert.equal(await context.polykit_consistency_get_page("/test"), false);
	context.fetch = async () => {
		throw new Error("offline");
	};
	assert.equal(await context.polykit_consistency_get_page("/test"), false);
	context.fetch = async () => ({ ok: true, text: async () => "page" });
	assert.equal(await context.polykit_consistency_get_page("/test"), parsed);
});

Deno.test("quicklinks can be opened again after a blocked popup", () => {
	let attempts = 0;
	const context = load("polykit-consistency", {
		window: {
			open: () => {
				attempts++;
				return null;
			},
		},
	});
	const event = { currentTarget: { dataset: { quicklink: "/test" } } };
	context.polykit_do_quicklinks(event);
	context.polykit_do_quicklinks(event);
	assert.equal(attempts, 2);
});

Deno.test("plural consistency failures show an error instead of leaving the loader running", async () => {
	for (const has_link of [false, true]) {
		const alternative = {
			textContent: "candidate",
			closest: () => ({
				nextElementSibling: {
					querySelectorAll: () => has_link ? [{}, { href: "/candidate?filters" }] : [],
				},
			}),
		};
		const context = load("polykit-consistency");
		context.document.createElement = () => ({ setAttribute() {} });
		let requests = 0;
		context.polykit_consistency_get_page = async () => {
			requests++;
			return requests === 1 ? { querySelectorAll: () => [alternative] } : false;
		};
		context.polykit_consistency_get_alternative_count = () => [1];
		const panel = {
			querySelectorAll: (selector) =>
				selector === "textarea"
					? [{ value: "one" }, { value: "many" }]
					: [{ textContent: "singular" }, { textContent: "plural" }],
		};
		const element = {
			classList: { contains: () => false, add() {} },
			closest: (selector) =>
				selector === ".panel-content"
					? panel
					: { querySelectorAll: () => [{}, {}, { href: "/consistency?search=test" }] },
		};
		let ended = false;
		context.polykit_consistency_end = (target, error) => {
			assert.equal(target, element);
			assert.equal(error, "consistency_error");
			ended = true;
		};
		await context.polykit_do_consistency(element);
		assert.equal(ended, true);
		assert.equal(requests, has_link ? 2 : 1);
	}
});
