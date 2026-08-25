"use strict";

import assert from "node:assert/strict";
import vm from "node:vm";

function load_background() {
	const listeners = { messages: [] };
	const sent = [];
	const created = [];
	let active_tab = {};
	const context = {
		chrome: {
			runtime: {
				lastError: null,
				onInstalled: { addListener() {} },
				onMessage: {
					addListener(callback) {
						listeners.messages.push(callback);
					},
				},
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
				query() {
					return Promise.resolve([active_tab]);
				},
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
	return {
		context,
		listeners,
		sent,
		created,
		set_active_tab(tab) {
			active_tab = tab;
		},
	};
}

Deno.test("popup opens settings in the current Translate WordPress tab", async () => {
	const { listeners, sent, created, set_active_tab } = load_background();
	set_active_tab({
		id: 42,
		url: "https://translate.wordpress.org/projects/wp-plugins/polykit/dev/ja/default/",
	});
	listeners.messages.at(-1)("polykit-open-settings-from-popup");
	await Promise.resolve();
	assert.deepStrictEqual(sent, [{ tab_id: 42, message: "polykit-open-settings" }]);
	assert.deepStrictEqual(created, []);
});

Deno.test("popup creates a settings tab outside Translate WordPress", async () => {
	const { listeners, sent, created, set_active_tab } = load_background();
	set_active_tab({ id: 7, url: "https://example.com/" });
	listeners.messages.at(-1)("polykit-open-settings-from-popup");
	await Promise.resolve();
	assert.deepStrictEqual(sent, []);
	assert.strictEqual(
		JSON.stringify(created),
		JSON.stringify([{
			url: "https://translate.wordpress.org/#polykit-settings",
		}]),
	);
});

Deno.test("popup falls back to a new tab when messaging fails", async () => {
	const { context, listeners, created, set_active_tab } = load_background();
	context.chrome.runtime.lastError = { message: "No receiver" };
	set_active_tab({ id: 42, url: "https://translate.wordpress.org/" });
	listeners.messages.at(-1)("polykit-open-settings-from-popup");
	await Promise.resolve();
	assert.strictEqual(
		JSON.stringify(created),
		JSON.stringify([{
			url: "https://translate.wordpress.org/#polykit-settings",
		}]),
	);
});
