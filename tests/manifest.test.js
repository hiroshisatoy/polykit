"use strict";

import assert from "node:assert/strict";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(
	Deno.readTextFileSync(new URL("manifest.json", root)),
);

function file_exists(relative_path) {
	try {
		Deno.statSync(new URL(relative_path, root));
		return true;
	} catch (_error) {
		return false;
	}
}

Deno.test("manifest referenced files exist", () => {
	const files = [];
	files.push(manifest.background.service_worker);
	for (const content_script of manifest.content_scripts) {
		if (content_script.js) {
			files.push(...content_script.js);
		}
		if (content_script.css) {
			files.push(...content_script.css);
		}
	}
	for (const icon of Object.values(manifest.icons)) {
		files.push(icon);
	}
	for (const resource_group of manifest.web_accessible_resources) {
		for (const resource of resource_group.resources) {
			if (!resource.includes("*")) {
				files.push(resource);
			}
		}
	}
	for (const file of files) {
		assert.ok(file_exists(file), `missing file: ${file}`);
	}
});

Deno.test("scripts loaded by init.js are web accessible", () => {
	const init_source = Deno.readTextFileSync(new URL("js/init.js", root));
	const array_match = init_source.match(/const jsScripts = \[([^\]]*)\]/);
	assert.ok(array_match, "jsScripts array not found in init.js");
	const scripts = [...array_match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
	assert.ok(scripts.length > 0);
	const resources = manifest.web_accessible_resources.flatMap(
		(group) => group.resources,
	);
	for (const script of scripts) {
		const path = `js/${script}.js`;
		assert.ok(file_exists(path), `missing file: ${path}`);
		assert.ok(
			resources.includes(path),
			`not web accessible: ${path}`,
		);
	}
});

Deno.test("background is Chrome MV3 compatible", () => {
	assert.ok(Array.isArray(manifest.permissions));
	assert.ok(manifest.permissions.includes("storage"));
	assert.strictEqual(manifest.background.service_worker, "js/background.js");
	// Chrome は MV3 で background.scripts を拒否する。Firefox 向け差分は pack-ext.js が .xpi 生成時に適用する。
	assert.ok(!("scripts" in manifest.background));
	assert.ok(!("browser_specific_settings" in manifest));
});

Deno.test("init.js loads page scripts without waiting for changelog or GlotPress strings", () => {
	const init_source = Deno.readTextFileSync(new URL("js/init.js", root));
	assert.ok(init_source.includes("polykit_record_extension_status();"));
	assert.ok(init_source.includes("const gp_strings_promise = polykit_load_glotpress_strings();"));
	assert.ok(init_source.includes("await script(jsScripts);"));
	assert.ok(
		init_source.indexOf("await script(jsScripts);") <
			init_source.indexOf("const gp_strings = await gp_strings_promise;"),
	);
	assert.ok(init_source.includes('new CustomEvent("polykit:gp-strings-ready")'));
});

Deno.test("playground pages are excluded from content scripts", () => {
	const expected = [
		"*://translate.wordpress.org/*/playground",
		"*://translate.wordpress.org/*/playground/*",
	];
	for (const content_script of manifest.content_scripts) {
		assert.deepStrictEqual(content_script.exclude_matches, expected);
	}
});
