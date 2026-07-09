"use strict";

let polykit_user_edited = false;

const polykit_ignore_warnings_template = document.createElement("div");
polykit_ignore_warnings_template.classList.add(
	"polykit-ignore-warnings",
	"noselect",
);
const polykit_ignore_label = document.createElement("label");
polykit_ignore_label.append(
	polykit_create_element("input", { type: "checkbox" }),
	document.createTextNode(` ${polykit_t("save_with_warnings")}`),
);
polykit_ignore_warnings_template.appendChild(polykit_ignore_label);

/**
 * @param {string} key
 * @param {string} [defaultValue]
 * @returns {string}
 */
function polykit_get_level_setting(key, defaultValue = "warning") {
	const stored = localStorage.getItem(`polykit_${key}`);
	return null === stored ? defaultValue : stored;
}

/**
 * @param {string} level
 * @param {string} bucket
 * @param {HTMLElement|string} message
 * @param {{ warning: HTMLElement[], notice: HTMLElement[], highlight_me: string[] }} results
 * @returns {void}
 */
function polykit_push_check_result(level, bucket, message, results) {
	if (!message || "disabled" === level || "nothing" === level) {
		return;
	}
	const target = ("notice" === level) ? "notice" : "warning";
	if (message instanceof HTMLElement) {
		results[target].push(message);
	} else if ("" !== message) {
		const li = document.createElement("li");
		li.textContent = message;
		results[target].push(li);
	}
	if ("highlight" === bucket && "string" === typeof message) {
		results.highlight_me.push(message);
	}
}

/**
 * @param {HTMLElement[]} arr
 * @param {HTMLElement|string} el
 * @returns {void}
 */
function polykit_push_check_item(arr, el) {
	if (el && "" !== el) {
		arr.push(el);
	}
}

/**
 * @param {string[]} arr1
 * @param {string[]} arr2
 * @returns {void}
 */
function polykit_push_strings(arr1, arr2) {
	for (let i = 0; i < arr2.length; i++) {
		arr1.push(arr2[i]);
	}
}

/**
 * @param {string[]} a
 * @param {string[]} b
 * @returns {string}
 */
function polykit_array_diff(a, b) {
	return a.filter((item) => !b.includes(item)).toString();
}

/**
 * @param {string} original
 * @param {string} translated
 * @returns {HTMLElement|null}
 */
function polykit_check_placeholders(original, translated) {
	const placeholder_pattern = /(?:%[bcdefgosuxl]|%\d[$][bcdefgosuxl])/g;
	const original_ph = original.match(placeholder_pattern);
	const translated_ph = translated.match(placeholder_pattern);
	if (null === original_ph && null === translated_ph) {
		return null;
	}
	const msg = document.createElement("li");
	if (null !== original_ph && null === translated_ph) {
		msg.textContent = polykit_t(
			"check_placeholder_missing",
			original_ph.toString(),
		);
		return msg;
	}
	if (null === original_ph && null !== translated_ph) {
		msg.textContent = polykit_t(
			"check_placeholder_extra",
			translated_ph.toString(),
		);
		return msg;
	}
	if (original_ph.length < translated_ph.length) {
		msg.textContent = polykit_t(
			"check_placeholder_extra",
			polykit_array_diff(translated_ph, original_ph),
		);
		return msg;
	}
	if (original_ph.length > translated_ph.length) {
		msg.textContent = polykit_t(
			"check_placeholder_missing",
			polykit_array_diff(original_ph, translated_ph),
		);
		return msg;
	}
	const broken = [];
	for (let i = 0; i < original_ph.length; i++) {
		if (original_ph[i] !== translated_ph[i]) {
			broken.push(`${translated_ph[i]} instead of ${original_ph[i]}`);
		}
	}
	if (broken.length) {
		msg.textContent = polykit_t("check_placeholder_broken", broken.toString());
		return msg;
	}
	return null;
}

/**
 * @param {string} translated
 * @param {string} original
 * @returns {{ msg: HTMLElement|string, arr: string[] }}
 */
function polykit_check_double_spaces(translated, original) {
	const translated_double = translated.match(/[^ ]* {2,7}[^ ]*/gm) || [];
	const original_double = original.match(/[^ ]* {2,7}[^ ]*/gm) || [];
	if (translated_double.length > original_double.length) {
		const msg = document.createElement("li");
		const count = translated_double.length - original_double.length;
		msg.textContent = polykit_t(
			"check_double_space_extra",
			count,
			translated_double.join('", "').replace(/ /g, "\u00a0"),
		);
		return { msg, arr: translated_double };
	}
	if (translated_double.length < original_double.length) {
		const msg = document.createElement("li");
		msg.textContent = polykit_t(
			"check_double_space_missing",
			original_double.length - translated_double.length,
		);
		return { msg, arr: [] };
	}
	return { msg: "", arr: [] };
}

/**
 * @param {string} translated
 * @returns {{ msg: HTMLElement|string, arr: string[] }}
 */
function polykit_check_warning_words(translated) {
	const result = { msg: "", arr: [] };
	const words = polykit_get_text_setting("warning_words", "");
	words.split(",").forEach((word) => {
		if ("" !== word.trim() && polykit_occurrences(translated, word)) {
			result.arr.push(word);
		}
	});
	if (result.arr.length) {
		const msg = document.createElement("li");
		msg.textContent = polykit_t("check_warning_words", result.arr.join(", "));
		msg.className = "has-highlight";
		result.msg = msg;
	}
	return result;
}

/**
 * @param {string} translated
 * @param {string} original
 * @returns {HTMLElement|string}
 */
function polykit_check_match_words(translated, original) {
	let msgTxt = "";
	polykit_get_text_setting("match_words", "").split(",").forEach((word) => {
		if ("" === word.trim()) {
			return;
		}
		const in_translated = polykit_occurrences(translated, word);
		const in_original = polykit_occurrences(original, word);
		if (in_translated > in_original) {
			msgTxt += polykit_t(
				"check_match_extra",
				word,
				in_translated - in_original,
			);
		} else if (in_translated < in_original) {
			msgTxt += polykit_t(
				"check_match_missing",
				word,
				in_original - in_translated,
			);
		}
	});
	if ("" !== msgTxt) {
		const msg = document.createElement("li");
		msg.textContent = msgTxt;
		return msg;
	}
	return "";
}

/**
 * @param {string} translated
 * @returns {{ msg: HTMLElement|string, arr: string[] }}
 */
function polykit_check_tag_spaces(translated) {
	const bad = translated.replaceAll("br", "").match(
		/[^"'`„"([>/\s]+<[^>/]+>|<[^>/]+>\s|<\/[^>]+>[^.,!?:。।։។။།۔"'`")\]+<\/\s]|\s<\/[^>]+>/g,
	);
	if (null !== bad) {
		const msg = document.createElement("li");
		msg.textContent = polykit_t("check_tag_spaces", bad.length, bad.toString());
		msg.className = "has-highlight";
		return { msg, arr: bad };
	}
	return { msg: "", arr: [] };
}

/**
 * @param {HTMLElement[]} target
 * @param {string[]} messages
 * @returns {void}
 */
function polykit_push_messages_as_items(target, messages) {
	messages.forEach((message) => {
		const li = document.createElement("li");
		if (message.includes("<")) {
			li.innerHTML = message;
		} else {
			li.textContent = message;
		}
		target.push(li);
	});
}

/**
 * @param {string} original
 * @param {string} translated
 * @param {string} editor_id
 * @param {number} form_index
 * @returns {{ warning: HTMLElement[], notice: HTMLElement[], highlight_me: string[] }}
 */
function polykit_run_all_checks(original, translated, editor_id, form_index) {
	const results = polykit_run_extra_checks(original, translated);
	if ("" === translated) {
		return results;
	}
	polykit_push_messages_as_items(
		results.warning,
		polykit_collect_general_warnings(original, translated),
	);
	polykit_push_messages_as_items(
		results.warning,
		polykit_collect_locale_warnings(original, translated),
	);
	polykit_push_messages_as_items(
		results.warning,
		polykit_collect_glossary_warnings(editor_id, form_index),
	);
	if (0 === form_index) {
		polykit_push_messages_as_items(
			results.warning,
			polykit_collect_gp_warning_messages(editor_id),
		);
	}
	return results;
}

/**
 * @param {object} state
 * @returns {number}
 */
function polykit_count_row_check_issues(state) {
	let count = state.check_warnings.length;
	if (polykit_get_setting("checks_block_notices")) {
		count += state.check_notices.length;
	}
	return count;
}

/**
 * @param {string} original
 * @param {string} translated
 * @returns {{ warning: HTMLElement[], notice: HTMLElement[], highlight_me: string[] }}
 */
function polykit_run_extra_checks(original, translated) {
	const results = { warning: [], notice: [], highlight_me: [] };
	if ("" === translated) {
		const msg = document.createElement("li");
		msg.textContent = polykit_t("empty_translation");
		results.warning.push(msg);
		return results;
	}

	const placeholder = polykit_check_placeholders(original, translated);
	polykit_push_check_item(results.warning, placeholder);

	if (!polykit_get_setting("checks_enabled")) {
		return results;
	}

	const double_level = polykit_get_level_setting("check_double_spaces", "warning");
	const double_spaces = polykit_check_double_spaces(translated, original);
	if (double_spaces.arr.length) {
		polykit_push_check_result(
			double_level,
			"message",
			double_spaces.msg,
			results,
		);
		polykit_push_strings(results.highlight_me, double_spaces.arr);
	} else if (double_spaces.msg) {
		polykit_push_check_result("notice", "message", double_spaces.msg, results);
	}

	if ("" !== polykit_get_text_setting("warning_words", "")) {
		const warning_words = polykit_check_warning_words(translated);
		polykit_push_check_item(results.warning, warning_words.msg);
		polykit_push_strings(results.highlight_me, warning_words.arr);
	}

	if ("" !== polykit_get_text_setting("match_words", "")) {
		polykit_push_check_item(
			results.warning,
			polykit_check_match_words(translated, original),
		);
	}

	const tags_level = polykit_get_level_setting("check_tag_spaces", "notice");
	if ("disabled" !== tags_level) {
		const tag_spaces = polykit_check_tag_spaces(translated);
		polykit_push_check_result(tags_level, "message", tag_spaces.msg, results);
		polykit_push_strings(results.highlight_me, tag_spaces.arr);
	}

	return results;
}

/**
 * @param {Element} container
 * @param {string[]} terms
 * @param {string} highlight_class
 * @returns {void}
 */
function polykit_highlight_terms(container, terms, highlight_class) {
	if (!container || !terms.length) {
		return;
	}
	function span_inserter(node, looking_for) {
		let node_val = node.nodeValue;
		const parent_node = node.parentNode;
		while (true) {
			const found_index = node_val.toLowerCase().indexOf(
				looking_for.toLowerCase(),
			);
			if (found_index < 0) {
				if (node_val) {
					parent_node.insertBefore(document.createTextNode(node_val), node);
				}
				parent_node.removeChild(node);
				break;
			}
			const begin = node_val.substring(0, found_index);
			const matched = node_val.substr(found_index, looking_for.length);
			if (begin) {
				parent_node.insertBefore(document.createTextNode(begin), node);
			}
			const span = document.createElement("span");
			span.className = highlight_class;
			span.appendChild(document.createTextNode(matched));
			parent_node.insertBefore(span, node);
			node_val = node_val.substring(found_index + looking_for.length);
		}
	}
	function text_node_iterator(el, looking_for) {
		Array.prototype.slice.call(el.childNodes).forEach((n) => {
			if (3 === n.nodeType) {
				span_inserter(n, looking_for);
			} else if (1 === n.nodeType) {
				text_node_iterator(n, looking_for);
			}
		});
	}
	terms.forEach((term) => {
		text_node_iterator(container, term);
	});
}

/**
 * @param {string} editor_id
 * @param {boolean} highlight_spaces
 * @returns {{ has_warning: boolean, has_notice: boolean, check_results: HTMLElement, preview_class: string, preview_status: HTMLElement, labels: object[], highlights: string[][] }}
 */
function polykit_prepare_row_checks(editor_id, highlight_spaces) {
	const state = {
		has_warning: false,
		has_notice: false,
		check_results: document.createDocumentFragment(),
		check_warnings: [],
		check_notices: [],
		preview_class: "polykit-has-check-passed",
		preview_status: polykit_create_element("span", {
			class: "polykit-check-preview passed",
			title: polykit_t("check_all_passed"),
		}, "✓"),
		labels: [],
		highlights: [],
		ignore_status: "none",
	};

	const original_forms = [];
	const translated_forms = [];
	document.querySelectorAll(
		`${editor_id} .source-string.strings div .original-raw`,
	).forEach((form) => {
		original_forms.push(form.textContent);
	});
	document.querySelectorAll(
		`${editor_id} .translation-wrapper div.textareas textarea`,
	).forEach((form) => {
		translated_forms.push(form.value);
	});

	let original_form_i = 0;
	if (2 === original_forms.length && 1 === translated_forms.length) {
		original_form_i = 1;
	}

	translated_forms.forEach((translated_form, translated_form_i) => {
		const check_results = polykit_run_all_checks(
			original_forms[original_form_i],
			translated_form,
			editor_id,
			translated_form_i,
		);
		state.check_warnings.push(...check_results.warning);
		state.check_notices.push(...check_results.notice);
		const warnings_list = document.createElement("div");
		const notices_list = warnings_list.cloneNode(false);
		warnings_list.classList.add("polykit-check-warnings-list");
		state.labels[translated_form_i] = { notices: "", warnings: "" };

		if (check_results.warning.length) {
			state.has_warning = true;
			warnings_list.classList.add("has_warning");
			const warningsF = document.createDocumentFragment();
			check_results.warning.forEach((el) => {
				warningsF.appendChild(el.cloneNode(true));
			});
			warnings_list.textContent = polykit_t(
				"check_warnings_title",
				translated_forms.length > 1 ? ` #${translated_form_i + 1}` : "",
			);
			warnings_list.appendChild(document.createElement("ul")).appendChild(
				warningsF.cloneNode(true),
			);
			state.check_results.appendChild(warnings_list);
			state.labels[translated_form_i].warnings = polykit_create_check_labels_group(
				check_results.warning,
				"warning",
			);
		} else {
			warnings_list.textContent = polykit_t(
				"check_warnings_ok",
				translated_forms.length > 1 ? ` #${translated_form_i + 1}` : "",
			);
			state.check_results.appendChild(warnings_list);
		}

		if (check_results.notice.length) {
			state.has_notice = true;
			notices_list.className = "polykit-check-notices-list";
			const noticesF = document.createDocumentFragment();
			check_results.notice.forEach((el) => {
				noticesF.appendChild(el.cloneNode(true));
			});
			if (!state.has_warning) {
				notices_list.textContent = polykit_t(
					"check_notices_title",
					translated_forms.length > 1 ? ` #${translated_form_i + 1}` : "",
				);
			}
			notices_list.appendChild(document.createElement("ul")).appendChild(
				noticesF.cloneNode(true),
			);
			state.check_results.appendChild(notices_list);
			state.labels[translated_form_i].notices = polykit_create_check_labels_group(
				check_results.notice,
				"notice",
			);
		}

		state.highlights[translated_form_i] = check_results.highlight_me;
		if (2 === original_forms.length) {
			original_form_i = 1;
		}
	});

	const final_list = document.createElement("div");
	final_list.className = "polykit-checks-list";
	final_list.appendChild(state.check_results);
	state.check_results = final_list;

	if (state.has_warning) {
		state.ignore_status = "block";
		state.preview_class = "polykit-has-check-warning";
		state.preview_status = polykit_create_element("span", {
			class: "polykit-check-preview warning",
			title: polykit_t("check_has_warning"),
		}, "⚠");
	} else if (state.has_notice) {
		state.preview_class = "polykit-has-check-notice";
		state.preview_status = polykit_create_element("span", {
			class: "polykit-check-preview notice",
			title: polykit_t("check_has_notice"),
		}, "ℹ");
	}

	return state;
}

/**
 * @param {HTMLElement} el
 * @param {"warning"|"notice"} type
 * @returns {HTMLSpanElement}
 */
function polykit_create_check_label(el, type) {
	const label = document.createElement("span");
	label.className = `polykit-check-label polykit-check-label--${type}`;
	if (el.innerHTML && el.innerHTML !== el.textContent) {
		label.innerHTML = el.innerHTML;
	} else {
		label.textContent = el.textContent;
	}
	const full_text = label.textContent.trim();
	if (full_text.length > 72) {
		label.title = full_text;
	}
	return label;
}

/**
 * @param {HTMLElement[]} items
 * @param {"warning"|"notice"} type
 * @returns {HTMLDivElement}
 */
function polykit_create_check_labels_group(items, type) {
	const group = document.createElement("div");
	group.className = `polykit-check-${type}-labels`;
	items.forEach((item) => {
		group.appendChild(polykit_create_check_label(item, type));
	});
	return group;
}

/**
 * @param {object} form_label
 * @param {number} form_i
 * @param {NodeListOf<Element>} translation_p_text
 * @param {string[][]} highlights
 * @returns {void}
 */
function polykit_add_check_labels(form_label, form_i, translation_p_text, highlights) {
	if (!translation_p_text[form_i]) {
		return;
	}
	if (form_label.warnings || form_label.notices) {
		if (form_label.warnings) {
			const labels_w = document.createElement("div");
			labels_w.className = "polykit-check-warning-labels-row";
			const heading_w = document.createElement("span");
			heading_w.className = "polykit-check-labels-heading polykit-check-labels-heading--warning";
			heading_w.textContent = polykit_t("check_label_warning");
			labels_w.append(heading_w, form_label.warnings);
			translation_p_text[form_i].insertAdjacentElement("afterend", labels_w);
		}
		if (form_label.notices) {
			const labels_n = document.createElement("div");
			labels_n.className = "polykit-check-notice-labels-row";
			const heading_n = document.createElement("span");
			heading_n.className = "polykit-check-labels-heading polykit-check-labels-heading--notice";
			heading_n.textContent = polykit_t("check_label_notice");
			labels_n.append(heading_n, form_label.notices);
			translation_p_text[form_i].insertAdjacentElement("afterend", labels_n);
		}
		if (highlights.length && highlights[form_i]) {
			polykit_highlight_terms(
				translation_p_text[form_i],
				highlights[form_i],
				"polykit-check-highlight",
			);
		}
	}
}

/**
 * @param {string} editor_id
 * @returns {boolean}
 */
function polykit_editor_save_warnings_ignored(editor_id) {
	const editor = document.querySelector(editor_id);
	return Boolean(
		editor?.querySelector(".polykit-ignore-warnings input:checked"),
	);
}

/**
 * @param {string} editor_id
 * @param {string} preview_id
 * @returns {void}
 */
function polykit_editor_checks_init(editor_id, preview_id) {
	const editor = document.querySelector(editor_id);
	if (!editor || editor.dataset.polykitChecksInit) {
		return;
	}
	editor.dataset.polykitChecksInit = "true";

	const ignore_box = polykit_ignore_warnings_template.cloneNode(true);
	const wrapper = editor.querySelector(".translation-wrapper");
	wrapper && wrapper.insertAdjacentElement("afterend", ignore_box);

	document.querySelectorAll(
		`${editor_id} .translation-actions__save, ${editor_id} .approve`,
	).forEach((btn) => {
		btn.addEventListener("click", (e) => {
			const force = btn.classList.contains("forcesubmit");
			if (force) {
				// One-shot bypass added by the force-save hotkey / bulk copy.
				btn.classList.remove("forcesubmit");
			} else if (
				!polykit_editor_save_warnings_ignored(editor_id) &&
				!polykit_check_this_translation(editor_id, preview_id)
			) {
				e.preventDefault();
				e.stopPropagation();
				$gp.notices.error(polykit_t("check_fix_warnings_first"));
				return;
			}
			editor.querySelectorAll(".polykit-ignore-warnings input").forEach(
				(el) => {
					el.checked = false;
				},
			);
			polykit_user_edited = false;
			polykit_watch_save_success();
		});
	});
}

/**
 * Refresh preview highlights once GlotPress reports a successful save.
 *
 * @returns {void}
 */
function polykit_watch_save_success() {
	let tries = 0;
	const interval = setInterval(() => {
		const $notice = jQuery("#gp-js-message");
		tries++;
		if (!$notice.hasClass("gp-js-notice") || tries > 20) {
			if ($notice.hasClass("gp-js-success")) {
				polykit_non_breaking_space_highlight();
			}
			clearInterval(interval);
		}
	}, 500);
}

/**
 * @param {string} editor_id
 * @param {string} preview_id
 * @returns {boolean}
 */
function polykit_check_this_translation(editor_id, preview_id) {
	const state = polykit_prepare_row_checks(editor_id, false);
	polykit_display_check_results(editor_id, preview_id, state);
	return !state.has_warning;
}

/**
 * @param {string} editor_id
 * @param {string} preview_id
 * @param {object} state
 * @returns {void}
 */
function polykit_display_check_results(editor_id, preview_id, state) {
	const editor = document.querySelector(editor_id);
	const preview = document.querySelector(preview_id);
	if (!editor || !preview) {
		return;
	}
	preview.classList.remove(
		"polykit-has-check-warning",
		"polykit-has-check-notice",
		"polykit-has-check-passed",
	);
	preview.classList.add(state.preview_class);

	const ignore_el = editor.querySelector(".polykit-ignore-warnings");
	if (ignore_el) {
		ignore_el.style.display = state.ignore_status;
	}

	const existing = editor.querySelector(".polykit-checks-list");
	existing && existing.remove();
	preview.querySelectorAll(
		".polykit-check-warning-labels-row, .polykit-check-notice-labels-row",
	).forEach((el) => {
		el.remove();
	});
	const meta = editor.querySelector(
		".editor-panel__right .panel-content .meta dl",
	);
	meta && meta.insertAdjacentElement("beforebegin", state.check_results);

	const status_el = preview.querySelector(".polykit-check-preview");
	status_el && status_el.remove();
	const edit_btn = preview.querySelector(".actions .action.edit");
	edit_btn && edit_btn.insertAdjacentElement("afterbegin", state.preview_status);

	if (polykit_get_setting("checks_labels")) {
		const translation_p_text = preview.querySelectorAll(".translation-text");
		state.labels.forEach((form_label, form_i) => {
			polykit_add_check_labels(
				form_label,
				form_i,
				translation_p_text,
				state.highlights,
			);
		});
	}
	polykit_update_check_filters();
}

/**
 * @returns {void}
 */
function polykit_check_all_translations() {
	document.querySelectorAll("#translations tbody tr.preview").forEach(
		(translation_p) => {
			if (translation_p.classList.contains("untranslated")) {
				return;
			}
			const preview_id = `#${translation_p.id}`;
			const editor_id = preview_id.replace("preview", "editor");
			polykit_editor_checks_init(editor_id, preview_id);
			if (!polykit_get_setting("checks_enabled")) {
				return;
			}
			const state = polykit_prepare_row_checks(editor_id, true);
			polykit_display_check_results(editor_id, preview_id, state);
		},
	);
}

/**
 * @returns {void}
 */
function polykit_checks_mutations() {
	const tbody = document.querySelector("#translations tbody");
	if (!tbody) {
		return;
	}
	const observer = new MutationObserver((mutations) => {
		mutations.forEach((mutation) => {
			mutation.addedNodes.forEach((el) => {
				if (1 !== el.nodeType || !el.classList.contains("editor")) {
					return;
				}
				const editor_id = `#${el.id}`;
				const preview_id = editor_id.replace("editor", "preview");
				polykit_editor_checks_init(editor_id, preview_id);
				if (polykit_get_setting("checks_enabled")) {
					const state = polykit_prepare_row_checks(editor_id, false);
					polykit_display_check_results(editor_id, preview_id, state);
				}
				polykit_history_on_editor_open(editor_id);
			});
		});
	});
	observer.observe(tbody, { childList: true, subtree: true });
}

/**
 * @returns {void}
 */
function polykit_update_check_filters() {
	const notices_count = document.querySelectorAll(".polykit-has-check-notice").length;
	const warnings_count = document.querySelectorAll(".polykit-has-check-warning").length;
	const filters = document.querySelector(".polykit-check-filters");
	if (!filters) {
		return;
	}
	const notice_link = filters.querySelector(".polykit-filter-notices");
	const warning_link = filters.querySelector(".polykit-filter-warnings");
	if (notice_link) {
		notice_link.textContent = polykit_t("filter_notices", notices_count);
		notice_link.title = polykit_t("filter_notices_hint", notices_count);
	}
	if (warning_link) {
		warning_link.textContent = polykit_t("filter_warnings", warnings_count);
		warning_link.title = polykit_t("filter_warnings_hint", warnings_count);
	}
}

/**
 * @returns {void}
 */
function polykit_check_filters() {
	const review_toolbar = polykit_ensure_review_toolbar();
	if (!review_toolbar || document.querySelector(".polykit-check-filters")) {
		return;
	}
	const filters = document.createElement("div");
	filters.className = "polykit-check-filters";
	const notices_link = polykit_create_element("a", {
		href: "#",
		class: "polykit-filter-notices",
	});
	notices_link.textContent = polykit_t("filter_notices", 0);
	const warnings_link = polykit_create_element("a", {
		href: "#",
		class: "polykit-filter-warnings",
	});
	warnings_link.textContent = polykit_t("filter_warnings", 0);
	const all_link = polykit_create_element("a", {
		href: "#",
		class: "polykit-filter-all",
	}, polykit_t("filter_all"));
	filters.append(notices_link, " | ", warnings_link, " | ", all_link);
	const insert_before = review_toolbar.querySelector(
		".separator, .polykit-toolbar-extensions",
	);
	if (insert_before) {
		review_toolbar.insertBefore(filters, insert_before);
	} else {
		review_toolbar.appendChild(filters);
	}

	warnings_link.addEventListener("click", (e) => {
		e.preventDefault();
		document.querySelectorAll("tr.preview").forEach((el) => {
			el.style.display = "none";
		});
		document.querySelectorAll("tr.preview.polykit-has-check-warning").forEach(
			(el) => {
				el.style.display = "table-row";
			},
		);
	});
	notices_link.addEventListener("click", (e) => {
		e.preventDefault();
		document.querySelectorAll("tr.preview").forEach((el) => {
			el.style.display = "none";
		});
		document.querySelectorAll("tr.preview.polykit-has-check-notice").forEach(
			(el) => {
				el.style.display = "table-row";
			},
		);
	});
	all_link.addEventListener("click", (e) => {
		e.preventDefault();
		document.querySelectorAll("tr.preview").forEach((el) => {
			el.style.display = "table-row";
		});
	});
	polykit_update_check_filters();
	polykit_wrap_review_paging_row();
}

/**
 * @returns {void}
 */
function polykit_checks_init() {
	if ("undefined" === typeof $gp_editor_options) {
		return;
	}
	polykit_check_filters();
	polykit_check_all_translations();
	polykit_checks_mutations();

	document.querySelectorAll("textarea").forEach((el) => {
		el.addEventListener("change", () => {
			polykit_user_edited = true;
		});
	});
	window.addEventListener("beforeunload", (e) => {
		if (!polykit_get_setting("prevent_unsaved") || !polykit_user_edited) {
			return;
		}
		const open_editor = document.querySelector(
			'.editor[style="display: table-row;"] textarea, .editor:not([style]) textarea',
		);
		if (open_editor && "" !== open_editor.value) {
			e.preventDefault();
			e.returnValue = "";
			return e;
		}
	});
}
