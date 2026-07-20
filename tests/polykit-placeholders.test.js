"use strict";

import assert from "node:assert/strict";
import vm from "node:vm";

const context = {
	document: {
		createElement: () => ({ textContent: "" }),
	},
	polykit_t: (key, ...args) => [key, ...args].join("|"),
	polykit_array_diff: (a, b) => a.filter((item) => !b.includes(item)).toString(),
};
vm.createContext(context);
const source = Deno.readTextFileSync(
	new URL("../js/polykit-checks.js", import.meta.url),
);
const start = source.indexOf("function polykit_extract_placeholders");
const end = source.indexOf("function polykit_check_double_spaces");
vm.runInContext(source.slice(start, end), context);

function count(original, translated) {
	return context.polykit_check_placeholder_count(original, translated)
		?.textContent ?? null;
}

function order(original, translated) {
	return context.polykit_check_placeholder_order(original, translated)
		?.textContent ?? null;
}

Deno.test("placeholder count detects missing and extra", () => {
	assert.strictEqual(
		count("%d %s", "hello"),
		"check_placeholder_missing|%d, %s",
	);
	assert.strictEqual(
		count("hello", "%d"),
		"check_placeholder_extra|%d",
	);
});

Deno.test("placeholder count detects different types with same length", () => {
	assert.strictEqual(
		count("%d %s", "%s %s"),
		"check_placeholder_mismatch|%d %s|%s %s",
	);
});

Deno.test("placeholder order only when the same set is reordered", () => {
	assert.strictEqual(
		order("%1$d %2$d", "%2$d %1$d"),
		"check_placeholder_order|%1$d %2$d|%2$d %1$d",
	);
	assert.strictEqual(order("%d %s", "%s"), null);
	assert.strictEqual(order("%1$d %2$d", "%1$d %2$d"), null);
	assert.strictEqual(count("%1$d %2$d", "%2$d %1$d"), null);
});
