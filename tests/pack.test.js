import assert from "node:assert/strict";
import { fromFileUrl } from "@std/path";
import { listPackageFiles } from "../pack-ext.js";

const root = fromFileUrl(new URL("../", import.meta.url));

Deno.test("packages contain only runtime files", async () => {
	const files = await listPackageFiles(root);
	const manifest = JSON.parse(await Deno.readTextFile(`${root}manifest.json`));

	const referenced = [
		manifest.background.service_worker,
		manifest.action.default_popup,
		...Object.values(manifest.icons),
		...manifest.content_scripts.flatMap((script) => [...(script.js ?? []), ...(script.css ?? [])]),
		...manifest.web_accessible_resources.flatMap((group) => group.resources)
			.filter((resource) => !resource.includes("*")),
	];
	for (const file of referenced) {
		assert.ok(files.includes(file), `missing from package: ${file}`);
	}
	assert.ok(files.includes("languages/ja/polykit.json"));
	assert.ok(files.includes("LICENSE"));

	const unwanted =
		/^(docs|tests|\.github)\/|\.(md|ai|svg|zip|xpi)$|^(pack-ext\.js|deno\.(json|lock))$|\.DS_Store$|^icons\/image\.png$/;
	for (const file of files) {
		assert.ok(!unwanted.test(file), `unwanted file in package: ${file}`);
	}
});
