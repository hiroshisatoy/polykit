let polykit_quicklinks_copy_state = "true" === localStorage.getItem("polykit_quicklinks_copy_state");
let polykit_quicklinks_window = { "closed": true };

if (typeof $gp_editor_options !== "undefined") {
	polykit_quicklinks();
	polykit_consistency();
	polykit_search_init();
	polykit_google_translate_init();
}

function polykit_quicklinks(current_editor = ".editor") {
	const polykit_quicklinks_output = polykit_create_element("span", {
		"class": "polykit-quicklinks",
	});
	const polykit_quicklinks_copy = polykit_create_element(
		"button",
		{
			"type": "button",
			"class": `polykit-quicklinks-copy with-tooltip ${polykit_quicklinks_copy_state ? "active" : "inactive"}`,
			"aria-label": polykit_t("ql_copy_toggle_hint"),
		},
	);
	polykit_quicklinks_copy.append(
		polykit_create_element(
			"span",
			{ "class": "screen-reader-text" },
			polykit_t("ql_copy_toggle"),
		),
		polykit_create_element("span", {
			"class": "dashicons dashicons-clipboard",
			"aria-hidden": "true",
		}),
	);
	const polykit_quicklinks_separator = polykit_create_element(
		"span",
		{
			"class": `polykit-quicklinks-plus dashicons ${
				polykit_quicklinks_copy_state ? "dashicons-plus" : "separator"
			}`,
			"aria-hidden": "true",
		},
	);
	const polykit_quicklinks_permalink = polykit_create_element("button", {
		"class": "polykit-quicklinks-item polykit-quicklinks-permalink with-tooltip",
		"aria-label": polykit_t("ql_permalink"),
	});
	polykit_quicklinks_permalink.append(
		polykit_create_element(
			"span",
			{ "class": "screen-reader-text" },
			polykit_t("ql_permalink"),
		),
		polykit_create_element("span", {
			"class": "dashicons dashicons-admin-links",
			"aria-hidden": "true",
		}),
	);

	const polykit_quicklinks_history = polykit_create_element("button", {
		"class": "polykit-quicklinks-item polykit-quicklinks-history with-tooltip",
		"aria-label": polykit_t("ql_history"),
	});
	polykit_quicklinks_history.append(
		polykit_create_element(
			"span",
			{ "class": "screen-reader-text" },
			polykit_t("ql_history"),
		),
		polykit_create_element("span", {
			"class": "dashicons dashicons-backup",
			"aria-hidden": "true",
		}),
	);

	const polykit_quicklinks_consistency = polykit_create_element("button", {
		"class": "polykit-quicklinks-item polykit-quicklinks-consistency with-tooltip",
		"aria-label": polykit_t("ql_consistency"),
	});
	polykit_quicklinks_consistency.append(
		polykit_create_element(
			"span",
			{ "class": "screen-reader-text" },
			polykit_t("ql_consistency"),
		),
		polykit_create_element("span", {
			"class": "dashicons dashicons-list-view",
			"aria-hidden": "true",
		}),
	);

	const polykit_quicklinks_discussion = polykit_create_element("button", {
		"class": "polykit-quicklinks-item polykit-quicklinks-discussion with-tooltip",
		"aria-label": polykit_t("ql_discussion"),
	});
	polykit_quicklinks_discussion.append(
		polykit_create_element(
			"span",
			{ "class": "screen-reader-text" },
			polykit_t("ql_discussion"),
		),
		polykit_create_element("span", {
			"class": "dashicons dashicons-format-chat",
			"aria-hidden": "true",
		}),
	);

	polykit_quicklinks_output.append(
		polykit_quicklinks_copy,
		polykit_quicklinks_separator,
		polykit_quicklinks_permalink,
		polykit_quicklinks_history,
		polykit_quicklinks_consistency,
		polykit_quicklinks_discussion,
	);

	polykit_add_elements(
		`${current_editor} .editor-panel__left .panel-header .panel-header-actions`,
		"afterBegin",
		polykit_quicklinks_output,
	);

	document.querySelectorAll(`${current_editor}`).forEach((editor) => {
		const editor_menu = editor.querySelectorAll(".button-menu__dropdown li a");
		editor.querySelector(".polykit-quicklinks-permalink").dataset.quicklink = editor_menu[0].href;
		editor_menu[1].href += "&historypage";
		editor.querySelector(".polykit-quicklinks-history").dataset.quicklink = editor_menu[1].href;
		editor.querySelector(".polykit-quicklinks-consistency").dataset.quicklink = `${
			editor_menu[2].href
		}&consistencypage`;
		editor.querySelector(".polykit-quicklinks-discussion").dataset.quicklink = editor_menu[3].href;
	});

	polykit_add_evt_listener(
		"click",
		`${current_editor} .polykit-quicklinks-copy, ${current_editor} .polykit-quicklinks-plus`,
		polykit_toggle_quicklinks_copy,
	);
	polykit_add_evt_listener(
		"click",
		`${current_editor} .polykit-quicklinks-item`,
		polykit_do_quicklinks,
	);
}

function polykit_do_quicklinks(event) {
	if (polykit_quicklinks_copy_state) {
		const btn_target = event.currentTarget;
		const current_aria_label = btn_target.getAttribute("aria-label");
		polykit_copy_to_clipboard(event.currentTarget.dataset.quicklink);
		btn_target.setAttribute("aria-label", polykit_t("ql_copied"));
		setTimeout(() => {
			btn_target.setAttribute("aria-label", current_aria_label);
		}, 2000);
	} else {
		if (!polykit_quicklinks_window.closed) {
			polykit_quicklinks_window.close();
		}
		polykit_quicklinks_window = window.open(
			event.currentTarget.dataset.quicklink,
			"_blank",
		);
	}
}

function polykit_toggle_quicklinks_copy() {
	document.querySelectorAll(".polykit-quicklinks-plus").forEach((el) => {
		el.classList.toggle("dashicons-plus");
		el.classList.toggle("separator");
	});
	document.querySelectorAll(".polykit-quicklinks-copy").forEach((el) => {
		el.classList.toggle("active");
		el.classList.toggle("inactive");
	});
	polykit_quicklinks_copy_state = !polykit_quicklinks_copy_state;
	localStorage.setItem(
		"polykit_quicklinks_copy_state",
		polykit_quicklinks_copy_state,
	);
}

function polykit_consistency(current_editor = ".editor") {
	if (document.querySelector(".polykit-get-consistency") !== null) {
		return;
	}
	const polykit_consistency_output = polykit_create_element("details", {
		"class": "polykit-consistency suggestions__translation-consistency",
		"open": "open",
	});
	const polykit_consistency_summary = polykit_create_element(
		"summary",
		{},
		polykit_t("consistency_title"),
	);
	const polykit_consistency_loading = document.querySelector(
		".suggestions__loading-indicator",
	);

	polykit_consistency_output.append(polykit_consistency_summary);
	polykit_consistency_loading &&
		polykit_consistency_output.append(polykit_consistency_loading);
	polykit_add_elements(
		`${current_editor} .editor-panel__left .suggestions-wrapper .suggestions__translation-memory`,
		"afterEnd",
		polykit_consistency_output,
	);

	// If the current table has only one editor, already opened, load suggestions for it.
	($gp.editor.current) &&
		polykit_do_consistency(
			$gp.editor.current[0].querySelector(".polykit-consistency"),
		);
}

async function polykit_do_consistency(el) {
	if (!el || el.classList.contains("initialized")) {
		return;
	}
	el.classList.add("initialized");
	const consistency_url = el.closest(".editor-panel").querySelectorAll(
		".button-menu__dropdown li a",
	)[2].href.replace("consistency?search", "consistency/?search");
	const consistency_page = await polykit_consistency_get_page(consistency_url);
	if (false === consistency_page) {
		polykit_consistency_end(el, polykit_t("consistency_error"));
		return;
	}

	const consistency_alternatives = consistency_page.querySelectorAll(
		".consistency-table tbody tr th strong",
	);

	if (!consistency_alternatives.length) {
		polykit_consistency_end(el, polykit_t("consistency_empty"));
		return;
	}

	const current_string = {
		"translated_texts": [],
		"form_names": [],
		"alternatives_count": polykit_consistency_get_alternative_count(
			consistency_page,
			consistency_alternatives.length,
		),
	};

	const this_panel_content = el.closest(".panel-content");
	this_panel_content.querySelectorAll("textarea").forEach(
		(translation_form) => {
			current_string.translated_texts[current_string.translated_texts.length] = translation_form.value;
		},
	);

	const translation_forms = this_panel_content.querySelectorAll(
		".translation-form-list .translation-form-list__tab",
	);
	translation_forms.forEach((form) => {
		current_string.form_names[current_string.form_names.length] = form
			.textContent.trim();
	});

	const polykit_consistency_suggestions = polykit_create_element("ul", {
		class: "polykit-suggestions-list",
	});
	const arrow = document.createElement("span");
	arrow.title = polykit_t("consistency_arrow_title");
	arrow.className = "polykit-arrow";
	arrow.textContent = " ⟵";

	for (
		let consistency_alternatives_i = 0;
		consistency_alternatives_i < consistency_alternatives.length;
		consistency_alternatives_i++
	) {
		const alternative = {
			"forms_text": [
				consistency_alternatives[consistency_alternatives_i].textContent,
			],
			"i": consistency_alternatives_i,
			"arrow": arrow,
		};
		if (translation_forms.length > 1) {
			const string_page = await polykit_consistency_get_page(
				consistency_alternatives[consistency_alternatives_i].parentNode
					.parentNode.nextSibling.querySelectorAll("td .meta a")[1].href
					.replace("?filters", "/?filters"),
			);
			const consistency_textareas = string_page.querySelectorAll(
				".translation-wrapper .textareas textarea",
			);

			consistency_textareas.forEach((textarea, i) => {
				alternative.forms_text[i] = textarea.value;
			});

			const polykit_consistency_item_header = polykit_create_element("li", {
				"class": "consistency-header-index",
			}, `#${consistency_alternatives_i + 1}`);
			polykit_consistency_item_header.append(
				polykit_create_element("button", {
					"type": "button",
					"class": "copy-full-alternative",
					"data-alternative_id": consistency_alternatives_i,
				}, polykit_t("consistency_copy")),
				polykit_create_element(
					"span",
					{ "class": "consistency-count" },
					current_string.alternatives_count[consistency_alternatives_i],
				),
			);
			polykit_consistency_suggestions.append(polykit_consistency_item_header);
			polykit_consistency_suggestions.classList.add("with-plural");
		}
		polykit_consistency_suggestions.append(
			polykit_consistency_add_alternative(alternative, current_string),
		);
	}
	if (
		"1" === $gp_editor_options.can_approve &&
		consistency_alternatives.length > 1
	) {
		const warning = document.createElement("div");
		warning.className = "gte-warning";
		warning.textContent = polykit_t(
			"consistency_warning",
			consistency_alternatives.length,
		);
		polykit_consistency_suggestions.insertAdjacentElement(
			"afterBegin",
			warning,
		);
	}

	el.append(polykit_consistency_suggestions);
	(translation_forms.length > 1) &&
		polykit_consistency_format_for_plural(this_panel_content);
	polykit_consistency_end(el);
}

async function polykit_consistency_get_page(url) {
	try {
		const res = await fetch(url, {
			headers: new Headers({ "User-agent": "Mozilla/4.0 Custom User Agent" }),
		});
		const txt = await res.text();
		const consistency_parser = new DOMParser();
		return consistency_parser.parseFromString(txt, "text/html");
	} catch (error) {
		return false;
	}
}

function polykit_consistency_get_alternative_count(
	consistency_page,
	consistency_count,
) {
	if (1 === consistency_count) {
		const unique_alternative_count = consistency_page.querySelectorAll("tr").length - 2;
		return [
			` (${unique_alternative_count} time${(unique_alternative_count > 1) ? "s" : ""})`,
		];
	}
	const alternatives_count = [];
	consistency_page.querySelectorAll(".translations-unique small").forEach(
		(el) => {
			alternatives_count[alternatives_count.length] = el.textContent;
		},
	);
	return alternatives_count;
}

function polykit_consistency_add_alternative(alternative, current_string) {
	const space_span = polykit_create_element("span", { "class": "space" }, " ");
	const consistency_alternative_fragment = document.createDocumentFragment();
	alternative.forms_text.forEach((form_text, form_text_i) => {
		const is_this_one = (form_text === current_string.translated_texts[form_text_i])
			? alternative.arrow.cloneNode(true)
			: "";
		const polykit_consistency_item = document.createElement("li");
		const polykit_consistency_item_div = polykit_create_element("div", {
			"class": "translation-suggestion with-tooltip",
			"role": "button",
			"aria-pressed": "false",
			"aria-label": polykit_t("consistency_copy_translation"),
			"tabindex": "0",
		});
		const polykit_consistency_item_translation = polykit_create_element(
			"span",
			{ "class": "translation-suggestion__translation" },
		);
		const alternative_as_words_fragment = document.createDocumentFragment();
		const alternative_as_words = form_text.split(" ");
		alternative_as_words.forEach((word, word_i) => {
			alternative_as_words_fragment.appendChild(document.createTextNode(word));
			(word_i < alternative_as_words.length - 1) &&
				alternative_as_words_fragment.append(space_span.cloneNode(true));
		});
		polykit_consistency_item_translation.append(
			alternative_as_words_fragment,
			is_this_one,
		);
		const meta_info = (current_string.form_names.length)
			? `${current_string.form_names[form_text_i]}: `
			: `${alternative.i + 1}: `;
		const polykit_consistency_item_meta = polykit_create_element("span", {
			"class": "translation-suggestion__translation index",
		}, meta_info);
		const polykit_consistency_item_raw = polykit_create_element("span", {
			"class": `translation-suggestion__translation-raw consistency_alternative__${alternative.i}_${form_text_i}`,
			"aria-hidden": "true",
		}, form_text);
		const polykit_consistency_item_button = polykit_create_element("button", {
			"type": "button",
			"class": "copy-suggestion",
		}, polykit_t("consistency_copy"));
		polykit_consistency_item_translation.prepend(polykit_consistency_item_meta);
		(0 === current_string.form_names.length) &&
			polykit_consistency_item_translation.append(
				polykit_create_element(
					"span",
					{ "class": "consistency-count" },
					current_string.alternatives_count[alternative.i],
				),
			);
		polykit_consistency_item_div.append(
			polykit_consistency_item_translation,
			polykit_consistency_item_raw,
			polykit_consistency_item_button,
		);
		polykit_consistency_item.append(polykit_consistency_item_div);
		consistency_alternative_fragment.appendChild(polykit_consistency_item);
	});
	return consistency_alternative_fragment;
}

function polykit_consistency_format_for_plural(this_panel_content) {
	polykit_add_evt_listener(
		"click",
		".copy-full-alternative",
		polykit_consistency_copy_full_alternative,
	);
	this_panel_content.querySelectorAll(".polykit-consistency .copy-suggestion")
		.forEach((el) => {
			el.parentNode.removeChild(el);
		});
	this_panel_content.querySelectorAll(
		".polykit-consistency .translation-suggestion",
	).forEach((el) => {
		el.classList.remove("translation-suggestion");
	});
	this_panel_content.querySelectorAll(".polykit-consistency .with-tooltip")
		.forEach((el) => {
			el.classList.remove("with-tooltip");
		});
}

function polykit_consistency_copy_full_alternative(event) {
	const panel_content = event.target.closest(".panel-content");
	const alternative_id = event.currentTarget.dataset.alternative_id;
	panel_content.querySelectorAll("textarea").forEach((textarea, i) => {
		const suggestion_form = panel_content.querySelector(
			`.consistency_alternative__${alternative_id}_${i}`,
		);
		if (suggestion_form) {
			textarea.value = suggestion_form.textContent;
		}
	});
	panel_content.querySelector(" .textareas.active textarea").focus();
}

function polykit_consistency_end(el, error = false) {
	error && el.append(error);
	const loading = el.querySelector(".suggestions__loading-indicator");
	loading && el.removeChild(loading);
}
