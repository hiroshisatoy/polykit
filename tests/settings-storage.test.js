"use strict";

import assert from "node:assert/strict";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const storageSource = Deno.readTextFileSync(new URL("js/settings-storage.js", root));
const initSource = Deno.readTextFileSync(new URL("js/init.js", root));

function contextWithSettings(initial = {}) {
	const values = new Map(Object.entries(initial));
	const classes = new Set();
	const context = vm.createContext({
		TextEncoder,
		document: {
			documentElement: {
				classList: {
					toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
				},
			},
		},
		localStorage: {
			getItem: (key) => values.has(key) ? values.get(key) : null,
			setItem: (key, value) => values.set(key, String(value)),
			removeItem: (key) => values.delete(key),
		},
	});
	vm.runInContext(storageSource, context);
	const applyStart = initSource.indexOf("function polykit_apply_modern_colors()");
	const applyEnd = initSource.indexOf("\n\npolykit_apply_modern_colors();", applyStart);
	vm.runInContext(initSource.slice(applyStart, applyEnd), context);
	return { context, values, classes, settings: vm.runInContext("polykitSettingsStorage", context) };
}

Deno.test("settings export accepts only known settings and safe values", () => {
	const { settings } = contextWithSettings();
	const imported = settings.parseExport(JSON.stringify({
		format: "polykit-settings",
		version: 1,
		settings: {
			polykit_translate_interface: false,
			polykit_modern_colors: true,
			polykit_ja_nakaguro: "notice",
			polykit_warning_words: "foo, bar",
		},
	}));
	assert.equal(imported.polykit_translate_interface, false);
	assert.equal(imported.polykit_modern_colors, true);
	assert.equal(imported.polykit_ja_nakaguro, "notice");
	const legacy = settings.parseExport(JSON.stringify({
		format: "polykit-settings",
		version: 1,
		settings: {
			polykit_translate_interface: true,
			polykit_autocopy_string_on_translation_opened: true,
		},
	}));
	assert.equal(legacy.polykit_translate_interface, true);
	assert.ok(!Object.hasOwn(legacy, "polykit_autocopy_string_on_translation_opened"));
	assert.ok(!settings.keys.includes("polykit_autocopy_string_on_translation_opened"));
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
	const { context, values, classes } = contextWithSettings({
		polykit_match_words: "stale",
		polykit_modern_colors: "true",
	});
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
	assert.ok(!values.has("polykit_modern_colors"));
	assert.ok(!classes.has("polykit-modern-colors"));
});

Deno.test("modern colors follow the saved setting and remain opt in", async () => {
	const { context, values, classes } = contextWithSettings();
	context.chrome = {
		storage: {
			sync: { get: async () => ({ polykit_modern_colors: true }) },
			local: { get: async () => ({ polykit_sync_migrated: true }) },
		},
	};
	const start = initSource.indexOf("async function polykit_sync_settings()");
	const end = initSource.indexOf("async function polykit_start()", start);
	vm.runInContext(initSource.slice(start, end), context);
	await vm.runInContext("polykit_sync_settings()", context);
	assert.equal(values.get("polykit_modern_colors"), "true");
	assert.ok(classes.has("polykit-modern-colors"));
	values.set("polykit_modern_colors", "false");
	vm.runInContext("polykit_apply_modern_colors()", context);
	assert.ok(!classes.has("polykit-modern-colors"));
});

Deno.test("modern palette defines the requested colors only behind the opt-in class", () => {
	const css = Deno.readTextFileSync(new URL("css/modern-colors.css", root));
	assert.match(css, /^html\.polykit-modern-colors \{/);
	assert.match(css, /--wp--preset--color--blueberry-1: #3858e9;/);
	assert.match(css, /--wp--preset--color--blueberry-4: #eff2ff;/);
	assert.match(css, /--gp-color-accent-fg: var\(--wp--preset--color--blueberry-1\);/);
	assert.match(css, /--gp-color-btn-primary-bg: var\(--wp--preset--color--blueberry-1\);/);
	assert.match(
		css,
		/--gp-color-btn-primary-hover-bg: color-mix\(in srgb, var\(--wp--preset--color--blueberry-1\) 82%, #000\);/,
	);
	const borderColors = css.split("\n").filter((line) =>
		/--gp-color-(?:border|btn-(?:primary-)?(?:hover-)?border)/.test(line)
	);
	assert.equal(borderColors.length, 6);
	assert.ok(borderColors.every((line) => /: #[0-9a-f]{6};/.test(line)));
	const chromaticColors = css.split("\n").filter((line) =>
		line.includes("--gp-color-") &&
		!/(--gp-color-fg-default|--gp-color-btn-primary-(?:hover-)?text|--gp-color-(?:border|btn-(?:primary-)?(?:hover-)?border))/
			.test(line)
	);
	assert.equal(chromaticColors.length, 6);
	assert.ok(chromaticColors.every((line) => line.includes("--wp--preset--color--blueberry-")));
	assert.doesNotMatch(css, /#2271b1|#135e96/);
	assert.match(
		css,
		/html\.polykit-modern-colors \.site-header \{\s*background: var\(--wp--preset--color--blueberry-1\);/,
	);
});
