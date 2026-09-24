// Serve the repository over HTTP and open tests/browser-smoke.html.
// No test framework or external scripts are required.
(async () => {
	const results = [];
	const check = (condition, message) => {
		if (!condition) throw new Error(message);
		results.push(message);
	};
	const load = (file) =>
		new Promise((resolve, reject) => {
			const script = document.createElement("script");
			script.src = `../js/${file}.js`;
			script.onload = resolve;
			script.onerror = reject;
			document.head.append(script);
		});
	const settle = () => new Promise((resolve) => setTimeout(resolve, 100));
	try {
		const strings = await (await fetch("../languages/ja/polykit.json")).json();
		window.polykit_t = (key) => strings[key] || key;
		window.polykit_extension = { currentVersion: "1", previousVersion: "1" };
		await load("polykit-functions");
		await load("polykit-settings");
		const container = document.querySelector("#settings-fixture");
		polykit_build_settings_tabs(container, [
			{ slug: "checks", label: "翻訳チェック", render: (panel) => panel.append("翻訳チェックの設定") },
			{ slug: "tools", label: "補助機能", render: (panel) => panel.append("検索・表示の設定") },
			{ slug: "welcome", label: "PolyKit について", render: (panel) => panel.append("更新情報") },
		]);
		const tabs = container.querySelectorAll('[role="tab"]');
		const panels = container.querySelectorAll('[role="tabpanel"]');
		check(tabs[0].tabIndex === 0 && !panels[0].hidden && panels[1].hidden, "初期タブと非表示パネル");
		tabs[0].dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
		check(
			document.activeElement === tabs[2] && !panels[2].hidden && panels[0].hidden,
			"End キーで最後のタブに移動",
		);
		tabs[2].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
		check(document.activeElement === tabs[0], "矢印キーでタブを循環");
		tabs[1].click();
		check(
			tabs[1].getAttribute("aria-selected") === "true" && getComputedStyle(panels[0]).display === "none",
			"クリックと CSS の選択状態が一致",
		);
		check(!document.querySelector("#polykit-settings-tab-styles"), "設定タブの動的 CSS 生成を廃止");

		// Only the small jQuery event registration boundary is stubbed; DOM/counts use real browser APIs.
		let countHandler;
		let registrations = 0;
		window.jQuery = () => ({
			off: () => {
				registrations = 0;
				return window.jQuery();
			},
			on: (_events, _selector, handler) => {
				countHandler = handler;
				registrations++;
			},
		});
		await load("polykit-meta");
		const editor = document.querySelector("#editor-test");
		polykit_add_string_counts(editor);
		polykit_add_string_counts(editor);
		const textarea = editor.querySelector("textarea");
		check(
			editor.querySelectorAll(".polykit-counts").length === 1 && registrations === 1,
			"文字数 UI とイベントの再初期化が重複しない",
		);
		check(
			editor.querySelector(".current-count-0 .characters").textContent.startsWith("5 "),
			"初期文字数に textarea の現在値を使用",
		);
		textarea.value = "a  b\nc";
		countHandler.call(textarea);
		check(editor.querySelector(".current-count-0 .words").textContent.startsWith("3 "), "改行・連続空白を含む語数");
		polykit_localize_date("#editor-test");
		polykit_localize_date("#editor-test");
		check(editor.querySelectorAll(".localized_date").length === 1, "日付の再初期化が重複しない");

		window.polykit_gp_strings = { Search: "検索", Settings: "設定" };
		window.polykit_get_setting = () => true;
		await load("polykit-gp-l10n");
		const calls = [];
		const localize = window.polykit_localize_glotpress;
		window.polykit_localize_glotpress = (root) => {
			calls.push(root);
			localize(root);
		};
		polykit_init_glotpress_l10n();
		polykit_init_glotpress_l10n();
		check(calls.length === 1, "日本語化の初期処理は1回");
		check(editor.querySelector(".original").textContent === "Search", "原文の文字列を保護");
		calls.length = 0;
		const added = document.createElement("button");
		added.textContent = "Search";
		added.title = "Settings";
		document.querySelector("#dynamic-fixture").append(added);
		added.setAttribute("aria-label", "Search");
		await settle();
		check(added.textContent === "検索" && added.title === "設定", "追加ノード本体のテキストと属性を翻訳");
		check(calls.length === 1 && calls[0] === added, "変更されたサブツリーだけを1回処理");
		await settle();
		check(calls.length === 1, "日本語化自身の DOM 更新は再走査しない");
		calls.length = 0;
		added.firstChild.data = "Settings";
		await settle();
		check(
			added.textContent === "設定" && calls.length === 1 && calls[0].nodeType === 3,
			"テキストノード単独の更新",
		);
		calls.length = 0;
		added.title = "Search";
		await settle();
		check(added.title === "検索" && calls.length === 1, "既存要素の属性更新");
		const removed = document.createElement("span");
		removed.textContent = "Search";
		added.after(removed);
		removed.remove();
		calls.length = 0;
		await settle();
		check(calls.length === 0, "処理前に削除されたノードを無視");
		check(
			getComputedStyle(document.querySelector(".polykit-suggestions-list")).overflowY === "auto",
			"候補リストの CSS が実際の DOM に適用される",
		);
		check(
			getComputedStyle(document.querySelector(".polykit-bulk-warning")).borderTopStyle === "solid",
			"一括処理通知の CSS が適用される",
		);
		window.polykitSmokeResult = { passed: results.length, results };
	} catch (error) {
		window.polykitSmokeResult = { error: String(error.stack || error), results };
	}
	document.querySelector("#test-results").textContent = JSON.stringify(window.polykitSmokeResult, null, 2);
})();
