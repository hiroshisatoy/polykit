"use strict";

import assert from "node:assert/strict";
import vm from "node:vm";

function load_background() {
	const listeners = {};
	const sent = [];
	const created = [];
	const context = {
		chrome: {
			action: {
				onClicked: {
					addListener(callback) {
						listeners.action = callback;
					},
				},
			},
			runtime: {
				lastError: null,
				onInstalled: { addListener() {} },
				onMessage: { addListener() {} },
				getManifest() {
					return { version: "1.0.1" };
				},
			},
			storage: {
				session: {
					set() {},
					get() {
						return Promise.resolve({});
					},
				},
			},
			tabs: {
				create(options) {
					created.push(options);
				},
				sendMessage(tab_id, message, callback) {
					sent.push({ tab_id, message });
					callback();
				},
			},
		},
	};
	vm.createContext(context);
	vm.runInContext(
		Deno.readTextFileSync(new URL("../js/background.js", import.meta.url)),
		context,
	);
	return { context, listeners, sent, created };
}

Deno.test("toolbar action opens settings in the current Translate WordPress tab", () => {
	const { listeners, sent, created } = load_background();
	listeners.action({
		id: 42,
		url: "https://translate.wordpress.org/projects/wp-plugins/polykit/dev/ja/default/",
	});
	assert.deepStrictEqual(sent, [{ tab_id: 42, message: "polykit-open-settings" }]);
	assert.deepStrictEqual(created, []);
});

Deno.test("toolbar action creates a settings tab outside Translate WordPress", () => {
	const { listeners, sent, created } = load_background();
	listeners.action({ id: 7, url: "https://example.com/" });
	assert.deepStrictEqual(sent, []);
	assert.strictEqual(
		JSON.stringify(created),
		JSON.stringify([{
			url: "https://translate.wordpress.org/#polykit-settings",
		}]),
	);
});

Deno.test("toolbar action falls back to a new tab when messaging fails", () => {
	const { context, listeners, created } = load_background();
	context.chrome.runtime.lastError = { message: "No receiver" };
	listeners.action({ id: 42, url: "https://translate.wordpress.org/" });
	assert.strictEqual(
		JSON.stringify(created),
		JSON.stringify([{
			url: "https://translate.wordpress.org/#polykit-settings",
		}]),
	);
});
