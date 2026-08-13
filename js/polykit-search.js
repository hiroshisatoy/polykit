"use strict";

let polykit_search_tabs = [];

/**
 * @returns {object}
 */
function polykit_get_search_settings() {
	const defaults = {
		this_project: true,
		wp: true,
		consistency: true,
		plugin: false,
		plugin_slug: "",
	};
	const stored = polykit_parse_json(
		localStorage.getItem("polykit_search"),
		null,
	);
	if (null === stored || "object" !== typeof stored) {
		return defaults;
	}
	return Object.assign(defaults, stored);
}

/**
 * @param {object} settings
 * @returns {void}
 */
function polykit_save_search_settings(settings) {
	localStorage.setItem("polykit_search", JSON.stringify(settings));
}

/**
 * @param {string} current_editor
 * @returns {void}
 */
function polykit_search_init(current_editor = ".editor") {
	if (!polykit_get_setting("search_enabled")) {
		return;
	}
	const settings = polykit_get_search_settings();
	const form = polykit_create_element("form", { class: "polykit-search" });
	const fragment = document.createDocumentFragment();
	fragment.appendChild(
		polykit_create_element("span", { class: "polykit-search-error" }),
	);
	fragment.appendChild(polykit_create_element("input", {
		class: "polykit-search-word",
		name: "polykit_search_word",
		placeholder: polykit_t("search_placeholder"),
		type: "text",
	}));
	fragment.appendChild(polykit_create_element("input", {
		class: "button polykit-search-action",
		value: polykit_t("search_submit"),
		type: "submit",
	}));
	[
		["this_project", polykit_t("search_this_project")],
		["wp", polykit_t("search_wp")],
		["consistency", polykit_t("search_consistency")],
		["plugin", polykit_t("search_plugins")],
	].forEach(([slug, label]) => {
		const label_el = polykit_create_element("label", {}, ` ${label}`);
		const input = polykit_create_element("input", {
			type: "checkbox",
			class: `polykit-search-option ${slug}`,
			"data-searchproject": slug,
		});
		input.checked = settings[slug];
		label_el.prepend(input);
		fragment.appendChild(label_el);
	});
	const slug_input = polykit_create_element("input", {
		class: `polykit-search-plugin-slug ${settings.plugin ? "" : "hidden"}`,
		name: "polykit_search_plugin_slug",
		placeholder: polykit_t("search_plugin_slugs"),
		type: "text",
		value: settings.plugin_slug || "",
	});
	fragment.appendChild(slug_input);
	fragment.appendChild(polykit_create_element("button", {
		class: "button polykit-search-close-tabs",
		style: "display:none;",
		type: "button",
	}, polykit_t("search_close_tabs")));
	form.appendChild(fragment);
	polykit_add_elements(
		`${current_editor} .editor-panel .editor-panel__right .panel-content`,
		"beforeend",
		form,
	);
}

/**
 * @param {string} message
 * @returns {void}
 */
function polykit_search_notice(message) {
	document.querySelectorAll(".polykit-search-error").forEach((el) => {
		el.textContent = message;
		setTimeout(() => {
			el.textContent = "";
		}, 3000);
	});
}

/**
 * @param {string} mode
 * @returns {void}
 */
function polykit_close_search_tabs(mode) {
	if ("all" === mode || "search" === mode) {
		polykit_search_tabs.forEach((tab) => {
			tab && !tab.closed && tab.close();
		});
		polykit_search_tabs = [];
	}
	document.querySelectorAll(".polykit-search-close-tabs").forEach((el) => {
		el.style.display = "none";
	});
}

/**
 * @param {string} term
 * @param {string} plugin_slugs
 * @returns {void}
 */
function polykit_do_search(term, plugin_slugs) {
	const settings = polykit_get_search_settings();
	if ("" === term || (settings.plugin && "" === plugin_slugs.trim())) {
		polykit_search_notice(polykit_t("search_empty_error"));
		return;
	}
	polykit_close_search_tabs("search");
	const hostname = window.location.hostname;
	const pathname = window.location.pathname;
	const project_url = pathname.split("/");
	const short_locale = project_url[project_url.length - 3];
	const current_locale = `${short_locale}/${project_url[project_url.length - 2]}`;
	const filters = `?filters[term]=${encodeURIComponent(term)}&filters[status]=current`;

	if (settings.this_project) {
		polykit_search_tabs.push(
			window.open(
				`https://${hostname}${pathname}${filters}&polykit_resultpage`,
				"_blank",
			),
		);
	}
	if (settings.wp) {
		polykit_search_tabs.push(
			window.open(
				`https://${hostname}/projects/wp/dev/${current_locale}${filters}&polykit_resultpage`,
				"_blank",
			),
		);
	}
	if (settings.consistency) {
		polykit_search_tabs.push(
			window.open(
				`https://${hostname}/consistency/?search=${
					encodeURIComponent(term)
				}&set=${current_locale}&polykit_consistencypage`,
				"_blank",
			),
		);
	}
	if (settings.plugin && "" !== plugin_slugs.trim()) {
		settings.plugin_slug = plugin_slugs;
		polykit_save_search_settings(settings);
		plugin_slugs.trim().split(/\s+/).forEach((slug) => {
			if ("" !== slug) {
				polykit_search_tabs.push(
					window.open(
						`https://${hostname}/projects/${slug}/dev/${current_locale}${filters}&polykit_resultpage`,
						"_blank",
					),
				);
			}
		});
	}
	document.querySelectorAll(".polykit-search-close-tabs").forEach((el) => {
		el.style.display = "";
	});
}

/**
 * @returns {void}
 */
function polykit_search_page_notice() {
	if (document.location.href.includes("polykit_resultpage")) {
		const notice = polykit_create_element("p", {
			class: "polykit-results-notice",
		}, polykit_t("search_result_notice"));
		const toolbar = document.querySelector(".filter-toolbar");
		toolbar && toolbar.insertAdjacentElement("beforebegin", notice);
	}
	if (document.location.href.includes("polykit_consistencypage")) {
		const notice = polykit_create_element("p", {
			class: "polykit-results-notice",
		}, polykit_t("search_consistency_notice"));
		const form = document.querySelector(".consistency-form");
		form && form.insertAdjacentElement("beforebegin", notice);
	}
}

/**
 * @returns {void}
 */
function polykit_search_events() {
	if (!polykit_get_setting("search_enabled")) {
		return;
	}
	polykit_search_page_notice();

	document.addEventListener("click", (event) => {
		const option = event.target.closest(".polykit-search-option");
		if (option) {
			const settings = polykit_get_search_settings();
			settings[option.dataset.searchproject] = option.checked;
			polykit_save_search_settings(settings);
			document.querySelectorAll(".polykit-search-option").forEach((el) => {
				el.checked = settings[el.dataset.searchproject];
			});
			document.querySelectorAll(".polykit-search-plugin-slug").forEach(
				(el) => {
					el.classList.toggle("hidden", !settings.plugin);
				},
			);
		}
		const close_tabs = event.target.closest(".polykit-search-close-tabs");
		if (close_tabs) {
			polykit_close_search_tabs("all");
		}
	});

	document.addEventListener("submit", (event) => {
		const form = event.target.closest(".polykit-search");
		if (!form) {
			return;
		}
		event.preventDefault();
		polykit_do_search(
			form.elements.polykit_search_word.value,
			form.elements.polykit_search_plugin_slug ? form.elements.polykit_search_plugin_slug.value : "",
		);
	});

	window.addEventListener("beforeunload", () => {
		polykit_close_search_tabs("all");
	});
}

/**
 * @param {string} current_editor
 * @returns {void}
 */
function polykit_google_translate_init(current_editor = ".editor") {
	if (!polykit_get_setting("google_translate")) {
		return;
	}
	const pathname = window.location.pathname.split("/");
	let short_locale = pathname[pathname.length - 3];
	const gp_gt_locales = {
		"zh-cn": "zh-CN",
		"zh-tw": "zh-TW",
		he: "iw",
		nb: "no",
		nn: "no",
	};
	if (short_locale in gp_gt_locales) {
		short_locale = gp_gt_locales[short_locale];
	} else {
		short_locale = short_locale.split("-")[0];
	}
	document.querySelectorAll(current_editor).forEach((editor_el) => {
		const wrapper = editor_el.querySelector(
			".editor-panel__left .suggestions-wrapper",
		);
		if (!wrapper || editor_el.querySelector(".polykit-get-gt")) {
			return;
		}
		const original = editor_el.querySelector(
			".source-string__singular span.original",
		);
		if (!original) {
			return;
		}
		const gt_string = encodeURIComponent(original.textContent);
		const gt_url = `https://translate.google.com/?sl=en&tl=${short_locale}&text=${gt_string}&op=translate`;
		const link = polykit_create_element("a", {
			class: "polykit-get-gt button",
			href: gt_url,
			target: "_blank",
			rel: "noreferrer noopener",
		}, polykit_t("google_translate"));
		wrapper.appendChild(link);
	});
}

/**
 * Focus search field in open editor.
 *
 * @returns {void}
 */
function polykit_focus_search() {
	const field = polykit_query_visible_editor(".polykit-search-word");
	field && field.focus();
}
