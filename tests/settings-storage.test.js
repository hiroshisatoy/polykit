"use strict";

import assert from "node:assert/strict";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const storageSource = Deno.readTextFileSync(new URL("js/settings-storage.js", root));
const initSource = Deno.readTextFileSync(new URL("js/init.js", root));

function contextWithSettings(initial = {}) {
	const values = new Map(Object.entries(initial));
	const context = vm.createContext({
		TextEncoder,
		localStorage: {
			getItem: (key) => values.has(key) ? values.get(key) : null,
			setItem: (key, value) => values.set(key, String(value)),
			removeItem: (key) => values.delete(key),
		},
	});
	vm.runInContext(storageSource, context);
	return { context, values, settings: vm.runInContext("polykitSettingsStorage", context) };
}

Deno.test("settings export accepts only known settings and safe values", () => {
	const { settings } = contextWithSettings();
	const imported = settings.parseExport(JSON.stringify({
		format: "polykit-settings",
		version: 1,
		settings: {
			polykit_translate_interface: false,
			polykit_ja_nakaguro: "notice",
			polykit_warning_words: "foo, bar",
		},
	}));
	assert.equal(imported.polykit_translate_interface, false);
	assert.equal(imported.polykit_ja_nakaguro, "notice");
	assert.throws(() => settings.parseExport('{"format":"other","version":1,"settings":{}}'));
	assert.throws(() => settings.clean({ polykit_extension_status: "private" }));
	assert.throws(() => settings.clean({ polykit_warning_words: "あ".repeat(3000) }));
});

Deno.test("first sync preserves remote settings and migrates only missing local settings", async () => {
	const { context, values } = contextWithSettings({
		polykit_translate_interface: "true",
		polykit_checks_enabled: "false",
		polykit_match_words: "legacy",
		polykit_extension_status: "local only",
	});
	const sync = { polykit_checks_enabled: true };
	const local = { polykit_translate_interface: false };
	context.chrome = {
		storage: {
			sync: {
				get: async () => ({ ...sync }),
				set: async (items) => Object.assign(sync, items),
			},
			local: {
				get: async () => ({ ...local }),
				set: async (items) => Object.assign(local, items),
				remove: async (key) => delete local[key],
			},
		},
	};
	const start = initSource.indexOf("async function polykit_sync_settings()");
	const end = initSource.indexOf("async function polykit_start()", start);
	vm.runInContext(initSource.slice(start, end), context);
	await vm.runInContext("polykit_sync_settings()", context);
	assert.equal(sync.polykit_checks_enabled, true);
	assert.equal(sync.polykit_translate_interface, false);
	assert.equal(sync.polykit_match_words, "legacy");
	assert.equal(values.get("polykit_checks_enabled"), "true");
	assert.equal(values.get("polykit_extension_status"), "local only");
	assert.equal(local.polykit_sync_migrated, true);
	assert.ok(!Object.hasOwn(local, "polykit_translate_interface"));
});

Deno.test("after migration missing sync values clear old page settings", async () => {
	const { context, values } = contextWithSettings({ polykit_match_words: "stale" });
	context.chrome = {
		storage: {
			sync: { get: async () => ({ polykit_checks_enabled: false }) },
			local: { get: async () => ({ polykit_sync_migrated: true }) },
		},
	};
	const start = initSource.indexOf("async function polykit_sync_settings()");
	const end = initSource.indexOf("async function polykit_start()", start);
	vm.runInContext(initSource.slice(start, end), context);
	await vm.runInContext("polykit_sync_settings()", context);
	assert.equal(values.get("polykit_checks_enabled"), "false");
	assert.ok(!values.has("polykit_match_words"));
});
