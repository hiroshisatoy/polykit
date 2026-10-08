import assert from "node:assert/strict";
import vm from "node:vm";

Deno.test("every check message gets its style-guide number or the generic badge", () => {
	class Element {
		className = "";
		classList = { add() {} };
		dataset = {};
		children = [];
		append() {}
		appendChild(child) {
			this.children.push(child);
		}
		insertBefore(child) {
			this.children.unshift(child);
		}
		querySelector(selector) {
			return this.children.find((child) =>
				selector.split(", ").some((part) => child.className === part.slice(1))
			) || null;
		}
		get firstChild() {
			return this.children[0];
		}
		get lastChild() {
			return this.children.at(-1);
		}
		get textContent() {
			return this.children.map((child) => child.nodeValue || child.textContent).join("");
		}
		set textContent(value) {
			this.children = [{ nodeType: 3, nodeValue: value }];
		}
	}
	const context = {
		HTMLElement: Element,
		document: { createElement: () => new Element(), createTextNode: (value) => value },
		polykit_create_element: () => new Element(),
		polykit_t: (key) => key === "check_generic_label" ? "汎用" : key,
	};
	vm.createContext(context);
	vm.runInContext(Deno.readTextFileSync(new URL("../js/polykit-checks.js", import.meta.url)), context);
	for (
		const [message, explicit, badge, remaining] of [
			["句読点が半角です (1-1)。", "", "1-1", "句読点が半角です。"],
			["括弧を確認してください (1-4・1-5・1-6)。", "", "1-4・1-5・1-6", "括弧を確認してください。"],
			["用語集の推奨訳が不足しています。", "3", "3", "用語集の推奨訳が不足しています。"],
			["プレースホルダーが不足しています。", "", "汎用", "プレースホルダーが不足しています。"],
		]
	) {
		const item = new Element();
		item.textContent = message;
		context.polykit_add_check_badge(item, explicit);
		assert.equal(item.firstChild.textContent, badge);
		assert.equal(item.firstChild.className, "polykit-check-badge");
		assert.equal(item.lastChild.nodeValue, remaining);
		context.polykit_add_check_badge(item, explicit);
		assert.equal(item.children.length, 2);
	}
	const glossary = [];
	context.polykit_push_messages_as_items(glossary, ["用語集の推奨訳の不足"], "3");
	assert.equal(glossary[0].dataset.polykitGuideline, "3");
});
