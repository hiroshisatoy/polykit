import assert from "node:assert/strict";
import vm from "node:vm";

Deno.test("original priority label translates as one phrase", () => {
	const strings = JSON.parse(Deno.readTextFileSync(new URL("../languages/ja/glotpress.json", import.meta.url)));
	const context = {
		window: { polykit_gp_strings: strings },
		document: { addEventListener() {} },
	};
	vm.createContext(context);
	vm.runInContext(Deno.readTextFileSync(new URL("../js/polykit-gp-l10n.js", import.meta.url)), context);
	for (const input of ["Priority of the original:", "優先度 of the original:"]) {
		context.input = input;
		assert.equal(vm.runInContext("polykit_gp_translate_text(input)", context), "原文の優先度:");
	}
});
