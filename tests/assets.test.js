import assert from "node:assert/strict";
import vm from "node:vm";

const root = new URL("../", import.meta.url);

Deno.test("all extension scripts parse as classic browser scripts", () => {
	for (const entry of Deno.readDirSync(new URL("js/", root))) {
		if (!entry.isFile || !entry.name.endsWith(".js")) continue;
		const source = Deno.readTextFileSync(new URL(`js/${entry.name}`, root));
		assert.doesNotThrow(() => new vm.Script(source, { filename: entry.name }));
	}
});

Deno.test("Japanese dictionaries contain only nonempty string values", () => {
	for (const file of ["polykit.json", "glotpress.json"]) {
		const strings = JSON.parse(Deno.readTextFileSync(new URL(`languages/ja/${file}`, root)));
		for (const [key, value] of Object.entries(strings)) {
			assert.equal(typeof value, "string", `${file}: ${key}`);
			assert.ok(key && value, `${file}: empty key/value`);
		}
	}
});
