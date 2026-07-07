"use strict";

let polykit_history_cache = "";
const polykit_is_history_page = document.location.href.includes("historypage");

/**
 * Minimal word-based diff for history compare.
 *
 * @param {string} oldString
 * @param {string} newString
 * @returns {DocumentFragment}
 */
function polykit_diff_to_fragment(oldString, newString) {
	const fragment = document.createDocumentFragment();
	if (oldString === newString) {
		fragment.appendChild(document.createTextNode(oldString));
		return fragment;
	}
	const old_words = oldString.split(/(\s+)/);
	const new_words = newString.split(/(\s+)/);
	const max = Math.max(old_words.length, new_words.length);
	for (let i = 0; i < max; i++) {
		const old_word = old_words[i] || "";
		const new_word = new_words[i] || "";
		if (old_word === new_word) {
			fragment.appendChild(document.createTextNode(old_word));
		} else {
			if (old_word) {
				const removed = document.createElement("span");
				removed.className = "polykit-diff-removed";
				removed.textContent = old_word;
				fragment.appendChild(removed);
			}
			if (new_word) {
				const added = document.createElement("span");
				added.className = "polykit-diff-added";
				added.textContent = new_word;
				fragment.appendChild(added);
			}
		}
	}
	return fragment;
}

/**
 * @returns {boolean}
 */
function polykit_history_enabled() {
	if ("undefined" === typeof $gp_editor_options) {
		return false;
	}
	if (!polykit_get_setting("history_main")) {
		return false;
	}
	if (polykit_is_history_page && !polykit_get_setting("history_page")) {
		return false;
	}
	return true;
}

/**
 * @returns {void}
 */
function polykit_history_init() {
	if (!polykit_history_enabled()) {
		return;
	}
	const editors = document.querySelectorAll("#translations tbody tr.editor");
	if (!editors.length) {
		return;
	}
	polykit_load_history_status(0, editors);
}

/**
 * @param {number} row_id
 * @param {NodeListOf<Element>} editors
 * @returns {void}
 */
function polykit_load_history_status(row_id, editors) {
	if (row_id >= editors.length) {
		return;
	}
	const editor = editors[row_id];
	const preview = document.querySelector(
		`#${editor.id.replace("editor", "preview")}`,
	);
	if (!preview) {
		polykit_load_history_status(row_id + 1, editors);
		return;
	}
	const status_match = preview.className.match(/status-([a-z]+)/);
	let translation_status = status_match ? status_match[1] : "untranslated";
	if ("changesrequested" === translation_status) {
		translation_status = "changesrequested";
	}
	const string_id = preview.getAttribute("row");
	const translation_id = editor.id;
	const url =
		`https://translate.wordpress.org${window.location.pathname}?filters%5Bstatus%5D=either&filters%5Boriginal_id%5D=${string_id}&sort%5Bby%5D=translation_date_added&sort%5Bhow%5D=desc`;

	const process = (data) => {
		polykit_analyse_history_status(
			data,
			translation_id,
			translation_status,
			url,
			row_id === editors.length - 1,
		);
		polykit_load_history_status(row_id + 1, editors);
	};

	if (
		("current" !== translation_status && "untranslated" !== translation_status) ||
		polykit_get_setting("history_count")
	) {
		if ("" !== polykit_history_cache) {
			process(polykit_history_cache);
		} else {
			fetch(url, {
				headers: new Headers({ "User-agent": "Mozilla/4.0 Custom User Agent" }),
			}).then((res) => res.text()).then((data) => {
				polykit_history_cache = data;
				process(data);
			}).catch(() => {
				polykit_load_history_status(row_id + 1, editors);
			});
		}
	} else {
		polykit_load_history_status(row_id + 1, editors);
	}
}

/**
 * @param {string} editor_id
 * @returns {void}
 */
function polykit_history_on_editor_open(editor_id) {
	if (!polykit_history_enabled()) {
		return;
	}
	const preview_id = editor_id.replace("editor", "preview");
	const preview = document.querySelector(preview_id);
	if (!preview || preview.querySelector(".polykit-h-label")) {
		return;
	}
	const editors = document.querySelectorAll("#translations tbody tr.editor");
	const row_id = Array.prototype.findIndex.call(
		editors,
		(el) => `#${el.id}` === editor_id,
	);
	if (row_id < 0) {
		return;
	}
	polykit_load_history_status(row_id, editors);
}

/**
 * @param {string} history_data
 * @param {string} translation_id
 * @param {string} translation_status
 * @param {string} url
 * @param {boolean} is_last
 * @returns {void}
 */
function polykit_analyse_history_status(
	history_data,
	translation_id,
	translation_status,
	url,
	is_last,
) {
	const history_page = new DOMParser().parseFromString(history_data, "text/html");
	const history_length = history_page.querySelectorAll(
		"#translations tbody tr.preview",
	).length;
	let count_label = "";
	let unique_warning_class = null;
	const string_history = {};

	if (polykit_get_setting("history_count") && history_length) {
		[
			"current",
			"waiting",
			"fuzzy",
			"rejected",
			"old",
			"changesrequested",
		].forEach((state) => {
			string_history[state] = history_page.querySelectorAll(
				`#translations tbody tr.preview.status-${state}`,
			).length;
			if (
				"current" === translation_status &&
				"current" === state &&
				string_history.current > 1
			) {
				string_history.current = `❌ ${string_history.current}`;
				unique_warning_class = "polykit-label-error";
			}
			if (
				state === translation_status &&
				"number" === typeof string_history[translation_status] &&
				!polykit_is_history_page
			) {
				string_history[translation_status]--;
			}
			if (string_history[state]) {
				const label = state.replace("changesrequested", "feedback");
				count_label += `${count_label ? ", " : ""}${string_history[state]} ${label}`;
			}
		});
		if (!history_page.querySelector(".next.disabled")) {
			count_label = polykit_t("history_more_than", count_label);
		}
	}

	let diff_output = null;
	let raw_compare_output = null;
	let diff_label = "";
	const compare_to_status = ("fuzzy" === translation_status) ? "waiting" : "current";

	if (
		"current" !== translation_status &&
		"untranslated" !== translation_status &&
		history_length
	) {
		const compared_rows = history_page.querySelectorAll(
			`#translations tbody tr.preview.status-${compare_to_status}`,
		);
		if (compared_rows.length) {
			const translation_forms = [];
			const compared_forms = [];
			document.querySelectorAll(
				`#${translation_id.replace("editor", "preview")} .translation-text`,
			).forEach((el) => {
				translation_forms.push(el.textContent);
			});
			compared_rows[0].querySelectorAll(".translation-text").forEach((el) => {
				compared_forms.push(el.textContent);
			});

			let diff_state = polykit_t("history_identical");
			diff_output = polykit_create_element("details", {
				class: "polykit_diff",
				open: "open",
			});
			const diff_title = polykit_create_element("summary");
			diff_title.textContent = polykit_t(
				"history_diff_title",
				translation_status,
				compared_rows.length > 1 ? "last " : "",
				compare_to_status,
			);
			const diff_content = document.createElement("ol");
			raw_compare_output = polykit_create_element("details", {
				class: "polykit_compared_to",
				open: "open",
			});
			const raw_title = polykit_create_element(
				"summary",
				{},
				polykit_t(
					"history_compare_to",
					compared_rows.length > 1 ? "Last " : "",
					compare_to_status,
				),
			);
			const raw_content = document.createElement("ol");

			translation_forms.forEach((form_text, form_i) => {
				if (form_text !== compared_forms[form_i]) {
					diff_state = polykit_t("history_different");
					const li = document.createElement("li");
					li.appendChild(
						polykit_diff_to_fragment(form_text, compared_forms[form_i]),
					);
					diff_content.appendChild(li);
				} else {
					diff_content.appendChild(polykit_create_element(
						"li",
						{ class: "identical-history" },
						polykit_t("history_identical_with", compare_to_status),
					));
				}
				raw_content.appendChild(polykit_create_element(
					"li",
					{},
					compared_forms[form_i],
				));
			});
			diff_output.append(diff_title, diff_content);
			raw_compare_output.append(raw_title, raw_content);
			diff_label = polykit_t(
				"history_diff_label",
				compared_rows.length > 1 ? "Multiple " : "",
				diff_state,
				compare_to_status,
			);
		}
	}

	const h_label_base = {
		class: "polykit-h-label",
		target: "_blank",
		href: `${url}&historypage`,
	};
	const preview_el = document.querySelector(
		`#${translation_id.replace("editor", "preview")}`,
	);
	const editor_el = document.querySelector(`#${translation_id}`);
	if (!preview_el || !editor_el) {
		return;
	}

	if ("" !== diff_label) {
		const preview_link = polykit_create_element("a", {
			...h_label_base,
			class: "polykit-h-label preview_label",
		}, diff_label);
		const edit_link = polykit_create_element("a", {
			...h_label_base,
			class: "polykit-h-label editor_label",
		}, `${diff_label} ↧`);
		preview_el.querySelector(".actions")?.insertAdjacentElement(
			"afterbegin",
			preview_link,
		);
		editor_el.querySelector(".editor-panel__left .panel-header")?.insertAdjacentElement(
			"afterend",
			edit_link,
		);
		if (diff_output) {
			editor_el.querySelector(".editor-panel__left .panel-content")
				?.insertAdjacentElement("afterbegin", diff_output);
		}
		if (raw_compare_output) {
			editor_el.querySelector(".editor-panel__left .panel-content")
				?.insertAdjacentElement("afterbegin", raw_compare_output);
		}
	}

	if ("" !== count_label) {
		const count_preview = polykit_create_element("a", {
			...h_label_base,
			class: `polykit-h-label preview_label ${unique_warning_class || ""}`,
		}, count_label);
		const count_editor = polykit_create_element("a", {
			...h_label_base,
			class: `polykit-h-label editor_label ${unique_warning_class || ""}`,
		}, `${count_label} ↧`);
		preview_el.querySelector(".actions")?.insertAdjacentElement(
			"afterbegin",
			count_preview,
		);
		editor_el.querySelector(".editor-panel__left .panel-header")?.insertAdjacentElement(
			"afterend",
			count_editor,
		);
	}
}
