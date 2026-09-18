"use strict";

function polykit_add_meta() {
	document.querySelectorAll("#translations tr.editor").forEach(polykit_add_string_counts);
}

/** 原文・現在の入力値・保存済み訳文の文字数を表示する。 */
function polykit_add_string_counts(row) {
	const editor = typeof row === "string" ? document.querySelector(row) : row;
	if (!editor) return;
	const originals = editor.querySelectorAll(".original");
	editor.querySelector(".polykit-counts")?.remove();
	const meta = editor.querySelector(".meta dl:last-of-type");
	if (!originals.length || !meta) return;
	const counts = polykit_create_element("div", { class: "polykit-counts" });
	meta.before(counts);
	const has_plural = originals.length > 1;
	const forms = editor.querySelectorAll(".textareas");
	originals.forEach((original) => {
		const prefix = has_plural ? `${original.parentElement.textContent.split(":")[0]} ` : "";
		polykit_add_count(counts, original.textContent, "original-count", `${prefix}${polykit_t("meta_original")}`);
	});
	forms.forEach((form, index) => {
		const textarea = form.querySelector("textarea.foreign-text");
		if (!textarea) return;
		const prefix = has_plural && forms.length <= 2
			? `${polykit_t(index === 0 ? "meta_singular" : "meta_plural")} `
			: "";
		if (has_plural && forms.length > 2) {
			const definition = editor.querySelector(`.translation-form-list button[data-plural-index="${index}"]`)
				?.getAttribute("aria-label") || "";
			const heading = polykit_create_element("dl", { class: "plural-heading" });
			heading.append(
				polykit_create_element("dt", {}, polykit_t("meta_plural_label")),
				polykit_create_element("dd", {}, definition),
			);
			counts.append(heading);
		}
		const translation = form.querySelector(".translation");
		if (translation?.textContent.trim()) {
			polykit_add_count(
				counts,
				translation.textContent,
				`translated-count-${index}`,
				`${prefix}${polykit_t("meta_translated")}`,
			);
		}
		textarea.dataset.polykitCountClass = `current-count-${index}`;
		polykit_add_count(
			counts,
			textarea.value,
			textarea.dataset.polykitCountClass,
			`${prefix}${polykit_t("meta_current")}`,
		);
	});
	// input は貼り付け・IME・音声入力にも対応。名前空間で再初期化時の重複登録を防ぐ。
	jQuery(editor).off("input.polykitCounts change.polykitCounts").on(
		"input.polykitCounts change.polykitCounts",
		"textarea.foreign-text",
		function () {
			const counter = counts.querySelector(`.${this.dataset.polykitCountClass}`);
			if (counter) polykit_update_count(counter, this.value);
		},
	);
}

/** 空白区切りの語数は参考値。文字数は従来どおり UTF-16 の長さを使う。 */
function polykit_text_counts(text) {
	return { characters: text.length, words: (text.match(/\S+/g) || []).length };
}

function polykit_add_count(container, text, countclass, label) {
	const counter = polykit_create_element("dl", { class: countclass });
	const value = document.createElement("dd");
	value.append(
		polykit_create_element("span", { class: "characters" }),
		" (",
		polykit_create_element("span", { class: "words" }),
		")",
	);
	counter.append(polykit_create_element("dt", {}, `${label}:`), value);
	polykit_update_count(counter, text);
	container.append(counter);
}

function polykit_update_count(counter, text) {
	const counts = polykit_text_counts(text);
	counter.querySelector(".characters").textContent = `${counts.characters} ${polykit_t("characters")}`;
	counter.querySelector(".words").textContent = `${counts.words} ${polykit_t("words_ref")}`;
}

const polykit_date_formatter = new Intl.DateTimeFormat(undefined, {
	year: "numeric",
	month: "numeric",
	day: "numeric",
	hour: "2-digit",
	minute: "2-digit",
	timeZoneName: "short",
});

function polykit_localize_date(current_editor = ".editor") {
	const localized_date = polykit_create_element("span", {
		"class": "localized_date",
	});
	document.querySelectorAll(`${current_editor} .editor-panel__right .meta dd`)
		.forEach((dd) => {
			if (19 === dd.textContent.indexOf(" UTC") && !dd.nextElementSibling?.classList.contains("localized_date")) {
				const date_data = dd.textContent.split(" ", 3);
				const date_date = date_data[0].split("-", 3);
				const date_time = date_data[1].split(":", 3);
				const new_date = new Date(
					Date.UTC(
						date_date[0],
						date_date[1] - 1,
						date_date[2],
						date_time[0],
						date_time[1],
						date_time[2],
					),
				);
				const this_localized_date = localized_date.cloneNode(true);
				if (Number.isNaN(new_date.getTime())) return;
				this_localized_date.textContent = polykit_date_formatter.format(new_date);
				dd.insertAdjacentElement("afterend", this_localized_date);
				dd.style.display = "none";
			}
		});
}
