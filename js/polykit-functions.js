/**
 * Saniitize the value striping html
 * @param {string} value
 * @returns {string} sanitized
 */
function sanitize_value(value) {
	if ("function" === typeof value.replace) {
		return value.replace(/<![\s\S]*?--[ \t\n\r]*>/gi, "");
	}
	return value;
}

/**
 * Get the today with the format dd/mm/yyyy used for the update daily check
 *
 * @returns String
 */
function polykit_today() {
	const today = new Date();
	let todayn = today.getDate();
	if (1 === todayn.length) {
		todayn = `0${todayn}`;
	}
	let monthn = today.getMonth() + 1;
	if (1 === monthn.length) {
		monthn = `0${monthn}`;
	}
	return `${todayn}/${monthn}/${today.getFullYear()}`;
}

/**
 * Get the the list of locales cached
 *
 * @returns Array
 */
function polykit_list_locales_cached() {
	let value = localStorage.getItem("polykit_locales");
	if ("" === value || "undefined" === value) {
		value = polykit_locales();
	} else {
		value = JSON.parse(value);
	}
	if ("string" === typeof value) {
		value = JSON.parse(value);
	}
	return value;
}

/**
 * Get the list of locales avalaible
 *
 * @returns Array
 */
function polykit_locales() {
	window.polykit_locales = ["ja"];
	const locales_date_cache = localStorage.getItem("polykit_locales_date");
	if (null === locales_date_cache || locales_date_cache !== polykit_today()) {
		jQuery.ajax({
			url: `https://codeat.co/glotdict/dictionaries/${polykit_version}.json`,
			dataType: "text",
			cache: false,
		}).done((data) => {
			localStorage.setItem("polykit_locales", data);
			window.polykit_locales = JSON.parse(data);
			localStorage.setItem("polykit_locales_date", polykit_today());
		});
	}
	if (locales_date_cache !== null) {
		let temp_value = JSON.parse(localStorage.getItem("polykit_locales"));
		if ("string" === typeof temp_value) {
			temp_value = JSON.parse(temp_value);
		}
		window.polykit_locales = Object.keys(temp_value);
	}
	return window.polykit_locales;
}

/**
 * Get the language saved in PolyKit
 *
 * @returns string
 */
function polykit_get_lang() {
	if ("undefined" === typeof window.polykit_lang) {
		const lang = localStorage.getItem("polykit_language");
		if ("" === lang || null === lang) {
			return "ja";
		}
		window.polykit_lang = sanitize_value(lang);
	}
	return window.polykit_lang;
}

/**
 * Add links for Translation global status and Language projects archive
 * @returns void
 */
function polykit_add_project_links() {
	if (
		jQuery(".gp-content .breadcrumb li").length > 3 &&
		jQuery(".gp-content .breadcrumb li:last-child a").length > 0
	) {
		let lang = jQuery(".gp-content .breadcrumb li:last-child a").attr("href")
			.split("/");
		lang = sanitize_value(lang[lang.length - 3]);
		const titleLinksContainer = document.createElement("SPAN");
		titleLinksContainer.id = "polykit-title-links";
		document.querySelector(".gp-content h2").appendChild(titleLinksContainer);
		jQuery("#polykit-title-links").append(
			`<a class="glossary-link" href="https://translate.wordpress.org/locale/${lang}/default" target="_blank" rel="noreferrer noopener">${
				jQuery(".gp-content .breadcrumb li:last-child a").text()
			} ${polykit_t("projects_suffix")}</a>` +
				`<a class="glossary-link" href="https://translate.wordpress.org/stats" target="_blank" rel="noreferrer noopener">${
					polykit_t("translation_global_status")
				}</a>`,
		);

		const titleLinks = document.querySelector("#polykit-title-links");
		const glossaryLinks = document.querySelector(
			".gp-heading>h2+.glossary-links",
		);
		if (glossaryLinks) {
			titleLinks.append(glossaryLinks);
		}
		const glossaryLinksSeparator = document.querySelector(
			"#polykit-title-links .glossary-links .separator",
		);
		glossaryLinksSeparator && glossaryLinksSeparator.remove();
	}
}

/**
 * Add links to glossary words
 *
 * @param {object} glossary_word node
 * @returns void
 */
function polykit_add_glossary_links(glossary_word) {
	const word = jQuery(glossary_word);
	if (glossary_word.closest("tr.preview")) {
		glossary_word.closest("tr.preview").classList.add("has-polykit");
	}
	word.wrap(
		`<a href="https://translate.wordpress.org/consistency?search=${word.text()}&amp;set=${polykit_get_lang_consistency()}%2Fdefault" target="_blank" rel="noreferrer noopener"></a>`,
	);
}

/**
 * Ensure the review toolbar container exists next to the filter toolbar.
 *
 * @returns {HTMLElement|null}
 */
function polykit_ensure_review_toolbar() {
	const existing = document.querySelector(".polykit-review-toolbar");
	if (existing) {
		return existing;
	}
	const filter_toolbar = polykit_get_filter_toolbar();
	if (!filter_toolbar) {
		return null;
	}
	const review_toolbar = document.createElement("div");
	review_toolbar.className = "polykit-review-toolbar";
	filter_toolbar.insertAdjacentElement("afterend", review_toolbar);
	return review_toolbar;
}

/**
 * Place review toolbar and top paging on one row (space-between).
 *
 * @returns {HTMLElement|null}
 */
function polykit_wrap_review_paging_row() {
	const review_toolbar = document.querySelector(".polykit-review-toolbar");
	const paging = document.querySelector(".paging");
	if (!review_toolbar && !paging) {
		return null;
	}
	const existing = review_toolbar?.closest(".polykit-review-paging-row") ||
		paging?.closest(".polykit-review-paging-row");
	if (existing) {
		return existing;
	}
	const row = document.createElement("div");
	row.className = "polykit-review-paging-row";
	const parent = review_toolbar?.parentNode || paging?.parentNode;
	if (!parent) {
		return null;
	}
	const anchor = review_toolbar || paging;
	parent.insertBefore(row, anchor);
	if (review_toolbar) {
		row.appendChild(review_toolbar);
	}
	if (paging) {
		row.appendChild(paging);
	}
	return row;
}

/**
 * Add the review button
 * @returns void
 */
function polykit_add_review_button() {
	if (
		jQuery("body.logged-in").length !== 0 &&
		jQuery(".discussions-table-head").length === 0 &&
		!document.querySelector(".polykit-review")
	) {
		const review_toolbar = polykit_ensure_review_toolbar();
		if (review_toolbar) {
			const review_button = document.createElement("input");
			review_button.type = "button";
			review_button.className = "button polykit-review";
			review_button.value = polykit_t("review");
			review_toolbar.appendChild(review_button);
		}
	}
}

/**
 * Get locale from slug or slug from locale
 *
 * @param {string} value locale or slug
 * @param {string} type the type of value 'locale' or 'slug'
 * @returns {string} slug or locale depending on type
 */
function polykit_get_locale_slug(value, type) {
	if ("locale" === type) {
		return polykit_locales_slugs[value] || "";
	}
	for (const elem in polykit_locales_slugs) {
		if (
			Object.prototype.hasOwnProperty.call(polykit_locales_slugs, elem) &&
			polykit_locales_slugs[elem] === value
		) {
			return elem;
		}
	}
	return "";
}

/**
 * Add the buttons to scroll to the row of the language choosen
 * @returns void
 */
function polykit_add_scroll_buttons() {
	const locations = {
		statsRegex: "https:\\/\\/translate.wordpress.org\\/stats\\/$",
		projectsRegex: "https:\\/\\/translate.wordpress.org\\/projects\\/[^\\/]+\\/[^\\/]+\\/$",
		appsRegex: "https:\\/\\/translate.wordpress.org\\/projects\\/apps\\/[^\\/]+\\/[^\\/]+\\/$",
	};

	let slug = polykit_get_locale_slug(polykit_get_lang(), "locale");

	const lang = polykit_get_lang();
	slug = slug.replace(/de/, "de/default");
	slug = slug.replace(/nl/, "nl/default");
	for (const regex in locations) {
		const position = document.querySelector("table");
		const acquired = (RegExp(locations[regex])).test(window.location.href);

		if (position && acquired) {
			if ("" === lang) {
				jQuery(position).before(
					`<span style="float:right;margin-bottom:1em">${
						polykit_t(
							"locale_not_set",
							"https://translate.wordpress.org/projects/wp/dev/en-gb/default/#polykit-language-picker",
						)
					}</span>`,
				);
				return;
			}
			jQuery(position).before(
				`<button style="float:right;margin-bottom:1em" class="polykit-scroll">${
					polykit_t("scroll_to", lang)
				}</button>`,
			);
			const StatsSpecificLinks = Array.prototype.slice.call(
				document.querySelectorAll(".stats-table tbody tr th a"),
			).filter((el) => {
				return polykit_get_lang() === el.textContent.trim();
			})[0];
			jQuery(".polykit-scroll").on("click", () => {
				const target = StatsSpecificLinks ||
					document.querySelector(`table tr th a[href*="/${slug}/"]`) ||
					document.querySelector(`table td strong a[href*="/${slug}/"]`);
				if (!target) return;
				const row = target.closest("tr");
				if (!row) return;
				row.style.border = "2px solid black";
				target.style.color = "#a70505";
				if (!target.textContent.includes("➤")) {
					target.textContent = `➤ ${target.textContent}`;
				}
				jQuery("html, body").animate({
					scrollTop: jQuery(row).offset().top - 160,
				});
			});
		}
	}
}

/**
 * First row inside the translations page filter toolbar.
 *
 * @returns {HTMLElement|null}
 */
function polykit_get_filters_toolbar_row() {
	return document.querySelector(
		"#upper-filters-toolbar > div:first-child, form.filters-toolbar:not(.bulk-actions) > div:first-child, .filter-toolbar form > div:first-child",
	);
}

/**
 * Filter toolbar form or wrapper (for sticky header and review button).
 *
 * @returns {HTMLElement|null}
 */
function polykit_get_filter_toolbar() {
	return document.querySelector(
		"#upper-filters-toolbar, form.filters-toolbar:not(.bulk-actions), .filter-toolbar",
	);
}

/**
 * Currently open translation editor row (GlotPress toggles display on .editor).
 *
 * @returns {HTMLElement|null}
 */
function polykit_get_visible_editor() {
	return document.querySelector('.editor[style="display: table-row;"]') ||
		document.querySelector(".editor:not([style])");
}

/**
 * @param {string} selector
 * @returns {Element|null}
 */
function polykit_query_visible_editor(selector) {
	const editor = polykit_get_visible_editor();
	return editor ? editor.querySelector(selector) : null;
}

/**
 * @returns {HTMLElement|null}
 */
function polykit_get_toolbar_extensions_panel() {
	return document.querySelector(".polykit-toolbar-extensions__panel");
}

/**
 * @param {HTMLElement} root
 * @returns {void}
 */
function polykit_toggle_toolbar_extensions_panel(root) {
	const panel = root.querySelector(".polykit-toolbar-extensions__panel");
	if (!panel) {
		return;
	}
	const open = "block" === panel.style.display;
	panel.style.display = open ? "none" : "block";
	root.classList.toggle("polykit-toolbar-extensions--open", !open);
}

/**
 * @param {HTMLElement} root
 * @param {HTMLElement} trigger
 * @returns {void}
 */
function polykit_bind_toolbar_extensions_accordion(root, trigger) {
	trigger.addEventListener("click", (e) => {
		e.preventDefault();
		e.stopPropagation();
		polykit_toggle_toolbar_extensions_panel(root);
	});
}

/**
 * @param {HTMLElement} root
 * @returns {HTMLElement}
 */
function polykit_wrap_toolbar_extensions_accordion(root) {
	const existing_panel = root.querySelector(".polykit-toolbar-extensions__panel");
	if (existing_panel) {
		return existing_panel;
	}
	const panel = document.createElement("div");
	panel.className = "polykit-toolbar-extensions__panel";
	panel.style.display = "none";
	while (root.firstChild) {
		panel.appendChild(root.firstChild);
	}
	const trigger = document.createElement("button");
	trigger.type = "button";
	trigger.className = "button polykit-toolbar-extensions__trigger";
	trigger.textContent = polykit_t("toolbar_extensions_toggle");
	root.prepend(trigger);
	root.appendChild(panel);
	polykit_bind_toolbar_extensions_accordion(root, trigger);
	return panel;
}

/**
 * @returns {HTMLElement}
 */
function polykit_create_toolbar_extensions_root() {
	const root = document.createElement("div");
	root.className = "polykit-toolbar-extensions";
	const trigger = document.createElement("button");
	trigger.type = "button";
	trigger.className = "button polykit-toolbar-extensions__trigger";
	trigger.textContent = polykit_t("toolbar_extensions_toggle");
	const panel = document.createElement("div");
	panel.className = "polykit-toolbar-extensions__panel";
	panel.style.display = "none";
	root.append(trigger, panel);
	polykit_bind_toolbar_extensions_accordion(root, trigger);
	return root;
}

/**
 * Accordion panel for PolyKit toolbar controls (next to the review button).
 *
 * @returns {HTMLElement|null}
 */
function polykit_ensure_toolbar_extensions() {
	const existing_panel = polykit_get_toolbar_extensions_panel();
	if (existing_panel) {
		return existing_panel;
	}

	let root = document.querySelector(".polykit-toolbar-extensions");
	if (root) {
		return polykit_wrap_toolbar_extensions_accordion(root);
	}

	root = polykit_create_toolbar_extensions_root();
	const review_toolbar = document.querySelector(".polykit-review-toolbar");
	if (review_toolbar) {
		const separator = document.createElement("span");
		separator.classList.add("separator");
		separator.textContent = "•";
		review_toolbar.append(separator, root);
		return root.querySelector(".polykit-toolbar-extensions__panel");
	}

	const filter_toolbars_div = polykit_get_filters_toolbar_row();
	if (!filter_toolbars_div) {
		return null;
	}
	const separator = document.createElement("span");
	separator.classList.add("separator");
	separator.textContent = "•";
	filter_toolbars_div.append(separator, root);
	return root.querySelector(".polykit-toolbar-extensions__panel");
}

/**
 * Print the locales selector
 *
 * @returns void
 */
function polykit_locales_selector() {
	if (document.getElementById("polykit-language-picker")) {
		return;
	}
	const filter_toolbars_div = polykit_get_filters_toolbar_row();
	if (!filter_toolbars_div) {
		return;
	}
	const lang = polykit_get_lang();
	const group = polykit_ensure_toolbar_extensions();
	if (!group) {
		return;
	}
	if (group.childElementCount > 0) {
		const separator = document.createElement("span");
		separator.classList.add("separator");
		separator.textContent = "•";
		group.append(separator);
	}
	const picker_container = document.createElement("div");
	picker_container.className = `polykit-language-picker-container${
		("" === lang || false === lang) ? " empty-locale" : ""
	}`;
	const picker_label = document.createElement("label");
	picker_label.htmlFor = "polykit-language-picker";
	picker_label.textContent = polykit_t("locale_label");
	const picker_select = document.createElement("select");
	picker_select.id = "polykit-language-picker";
	picker_select.className = "polykit_language";
	picker_container.append(picker_label, picker_select);
	group.append(picker_container);
	jQuery(".polykit_language").append(jQuery("<option></option>"));
	const polykit_locales_array = polykit_locales();
	var browserlanguage = Intl.DateTimeFormat().resolvedOptions().locale;
	browserlanguage = browserlanguage.replace("-", "_");
	jQuery.each(polykit_locales_array, (key, value) => {
		const new_option = jQuery("<option></option>").attr("value", value).text(
			value,
		);
		if (
			lang === value || (lang === "ja" && value === "ja") ||
			(lang === "" && value === "ja") ||
			(lang === "" && browserlanguage === value)
		) {
			new_option.attr("selected", true);
		}
		jQuery(".polykit_language").append(new_option);
	});
	jQuery(".polykit_language").change(() => {
		localStorage.setItem(
			"polykit_language",
			jQuery(".polykit_language option:selected").text(),
		);
		localStorage.setItem("polykit_glossary_date", "");
		polykit_locales();
		location.reload();
	});
}

/**
 * Get Global Handbook URL for current locale and populates polykit_glossary global constant
 * Don't check if handbook exists
 *
 * @return void
 */
function polykit_get_handbook_link() {
	let slug = polykit_get_locale_slug(polykit_get_lang(), "locale");
	if (!slug) {
		slug = "ja";
	}
	const global_handbook_url = `https://${slug}.wordpress.org/team/handbook/`;
	polykit_glossary.handbook_url = global_handbook_url;
}

/**
 * Get Global Glossary URL for current locale
 * Don't check if it exists
 *
 * @return string Global glossary URL
 */
function polykit_get_global_glossary_url() {
	let slug = polykit_get_locale_slug(polykit_get_lang(), "locale");
	if (slug === "") {
		slug = "ja";
	}

	const global_glossary_url = `https://translate.wordpress.org/locale/${slug}/default/glossary/`;
	return global_glossary_url;
}

/**
 * Get Locale glossary page HTML, treat data and populate polykit_glossary global constant
 *
 * @return string HTML of glossary page
 */
function polykit_get_glossary_global_data() {
	polykit_get_handbook_link();
	const global_glossary_url = polykit_get_global_glossary_url();
	if (global_glossary_url === false) {
		polykit_locales_selector();
		return;
	}

	fetch(global_glossary_url)
		.then((response) => response.text())
		.then((glossary_data) => {
			polykit_glossary.glossary_url = global_glossary_url;
			return glossary_data;
		})
		.then((glossary_data) => {
			polykit_extract_glossary_data(glossary_data);
		})
		.then(() => {
			polykit_add_official_links_to_filters();
		})
		.then(() => {
			polykit_locales_selector();
		})
		.catch(() => {
			polykit_locales_selector();
		});
}

/**
 * Extract data from Glossary and populates polykit_glossary global constant
 *
 * @returns void
 */
function polykit_extract_glossary_data(glossary_data) {
	polykit_user.is_gte = null !== glossary_data.match(/href="\/glossaries\/[0-9]*\/-edit/gmi);
	polykit_user.is_gte && document.body.classList.add("polykit-user-is-gte");

	const glossary_description = glossary_data.replace(/(\r\n|\n|\r)/gm, "")
		.match(/(?<=glossary-description">)(.*?)(?=<\/div>)/gmi);
	if (Array.isArray(glossary_description) && glossary_description.length) {
		const description_data = `<div>${glossary_description[0]}</div>}`;
		const html_document = new DOMParser().parseFromString(
			description_data,
			"text/html",
		);
		const guide_link = html_document.querySelector("#polykit-guide-link");
		if (guide_link) {
			polykit_glossary.guide.url = guide_link.href;
			polykit_glossary.guide.title = guide_link.dataset.title;
		}
	}
}

/**
 * Add official links to filters links
 *
 * @returns void
 */
function polykit_add_official_links_to_filters() {
	if (document.getElementById("polykit-guide-link")) {
		return;
	}
	const filter_toolbars_div = polykit_get_filters_toolbar_row();
	if (!filter_toolbars_div) {
		return;
	}
	if (
		"" === polykit_glossary.guide.url && "" === polykit_glossary.handbook_url
	) {
		return;
	}
	const polykit_guide_link = document.createElement("a");
	polykit_guide_link.id = "polykit-guide-link";
	polykit_guide_link.target = "_blank";
	polykit_guide_link.textContent = "" !== polykit_glossary.guide.title
		? polykit_glossary.guide.title
		: polykit_t("default_style_guide");
	polykit_guide_link.href = "" !== polykit_glossary.guide.url
		? polykit_glossary.guide.url
		: polykit_glossary.handbook_url;
	const group = polykit_ensure_toolbar_extensions();
	if (!group) {
		return;
	}
	group.append(polykit_guide_link);
}

function polykit_set_gte_settings() {
}

/**
 * Add a border and a legend for old strings (at least 6 months)
 *
 * @returns void
 */
function polykit_mark_old_strings() {
	jQuery("tr.preview").each(function () {
		const id = jQuery(this).attr("row");
		const date_found = jQuery(`#editor-${id} .meta dl:eq(1) dd`).html();
		if (date_found != null) {
			let date_timestamp = date_found;
			date_timestamp = new Date(date_timestamp);
			const today = new Date();
			const months = today.getMonth() - date_timestamp.getMonth() +
				(12 * (today.getFullYear() - date_timestamp.getFullYear()));
			if (months > 6) {
				jQuery(this).addClass("has-old-string");
			}
		}
	});
}

/**
 * Highlight in preview the non-breaking-space
 * https://github.com/GlotPress/GlotPress-WP/issues/801
 *
 * @returns {void}
 */
function polykit_non_breaking_space_highlight() {
	if (!polykit_get_setting("no_non_breaking_space")) {
		jQuery(
			"tr.preview > td.translation.foreign-text, blockquote.translation > em > small",
		).each(function () {
			const translation_item = jQuery(this).html();
			if (translation_item.indexOf("&nbsp;") > -1) {
				jQuery(this).html(
					DOMPurify.sanitize(
						translation_item.replace(
							/([^>])&nbsp;/g,
							'$1<span style="background-color:yellow">&nbsp;</span>',
						),
					),
				);
			}
		});
	}
}

/**
 * Highlight in preview the curly apostrophe
 *
 * @returns {void}
 */
function polykit_curly_apostrophe_highlight() {
	if (!polykit_get_setting("curly_apostrophe_warning")) {
		jQuery(
			"tr.preview > td.translation.foreign-text, blockquote.translation > em > small",
		).each(function () {
			const translation_item = jQuery(this).html();
			if (translation_item.indexOf("’") > -1) {
				jQuery(this).html(
					DOMPurify.sanitize(translation_item.replace(
						/([^>])’/g,
						"$1<span" +
							' style="background-color:yellow">’</span>',
					)),
				);
			}
		});
	}
}

/**
 * Get the language for consistency
 *
 * @returns string
 */
function polykit_get_lang_consistency() {
	const lang = polykit_get_lang();
	let reallang = "";
	if ("pt_BR" === lang) {
		reallang = "pt-br";
	} else if ("en_CA" === lang) {
		reallang = "en-ca";
	} else {
		reallang = lang.split("_");
		if (typeof reallang[1] !== "undefined") {
			reallang = reallang[1].toLowerCase();
		}
	}
	return reallang;
}

/**
 * Check if the string is the same
 *
 * @param {String} myString
 * @returns {Boolean}
 */
function polykit_is_uppercase(myString) {
	const lower = myString.toLowerCase();
	const upper = myString.toUpperCase();
	return (lower !== upper && myString === upper);
}

/**
 * Stop event propagation
 *
 * @param {Object} e
 * @returns {void}
 */
function polykit_stoppropagation(e) {
	if ("object" === typeof e) {
		e.stopImmediatePropagation();
	}
}

/**
 * Move the current locale first on Translate homepage.
 *
 * @returns {void}
 */
function polykit_current_locale_first() {
	if ("https://translate.wordpress.org/" !== document.URL) return;
	const locales_filter = document.querySelector("#locales-filter");
	const slug = polykit_get_locale_slug(polykit_get_lang(), "locale");
	const current_locale = document.querySelector(
		`#locales .english a[href="/locale/${slug}/"]`,
	);
	const first_locale = document.querySelector("div.locale:first-child");
	if (!current_locale) return;
	const current_locale_div = current_locale.closest("div.locale");
	if (!first_locale || !current_locale_div || !locales_filter) return;
	const clone = current_locale_div.cloneNode(true);
	first_locale.before(clone);
	clone.classList.add("polykit-locale-moved");
	locales_filter.addEventListener("input", (e) => {
		if (e.target.value !== "") {
			clone.style.display = "none";
		} else {
			clone.style.display = "block";
		}
	});
}

/**
 * Auto hide next editor when status action open it.
 *
 * @param {object} editor
 * @returns {void}
 */
function polykit_auto_hide_next_editor(editor) {
	const preview = editor.nextElementSibling;
	if (!preview) {
		return;
	}
	const next_editor = preview.nextElementSibling;
	const next_preview = next_editor.previousElementSibling;
	if (
		!next_editor || !next_preview ||
		!next_editor.classList.contains("editor") ||
		!next_preview.classList.contains("preview")
	) {
		return;
	}
	next_editor.style.display = "none";
	next_preview.style.display = "table-row";
}

/**
 * Mutations Observer for Translation Table Changes:
 * Auto hide next editor on status actions.
 * Add clone buttons on new preview rows and add glossary links.
 *
 * @triggers polykit_add_column, polykit_add_meta
 */
function polykit_wait_table_alter() {
	if (document.querySelector("#translations tbody") !== null) {
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				const user_is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
				mutation.addedNodes.forEach((addedNode) => {
					// Don't treat text nodes.
					if (1 !== addedNode.nodeType) {
						return;
					}

					const row_is_preview = addedNode.classList.contains("preview");
					const row_is_editor = addedNode.classList.contains("editor");
					const is_new_translation = mutation.previousSibling &&
						mutation.previousSibling.matches(".editor.untranslated");
					let status_has_changed = false;
					if (
						row_is_editor && mutation.previousSibling &&
						mutation.previousSibling.matches('[class*="status-"]')
					) {
						let status_before = "";
						let status_after = "";
						status_before = RegExp(/status-[a-z]*/).exec(
							mutation.previousSibling.className,
						)[0];
						status_after = RegExp(/status-[a-z]*/).exec(addedNode.className)[0];
						status_has_changed = status_before !== status_after;
					}

					if (
						user_is_pte && row_is_editor && !is_new_translation &&
						status_has_changed
					) {
						polykit_auto_hide_next_editor(addedNode);
					}
					if (user_is_pte && row_is_preview) {
						if (polykit_has_native_inline_actions()) {
							polykit_enhance_inline_action_buttons(addedNode);
						} else {
							polykit_add_column_buttons(addedNode);
						}
					}
					if (row_is_preview) {
						addedNode.querySelectorAll(".glossary-word").forEach(
							polykit_add_glossary_links,
						);
					}
					if (row_is_editor) {
						const editor_id = `#${addedNode.id}`;
						polykit_add_string_counts(editor_id);
						polykit_quicklinks(editor_id);
						polykit_consistency(editor_id);
						polykit_notranslate(editor_id);
						polykit_localize_date(editor_id);
						polykit_search_init(editor_id);
						polykit_google_translate_init(editor_id);
					}
				});
			});
		});

		observer.observe(document.querySelector("#translations tbody"), {
			attributes: true,
			childList: true,
			characterData: true,
		});
	}
}

/**
 * Creates HTML Element.
 *
 * @param {String} tagName This must be a valid HTML tag name.
 * @param {Object} attributes
 * @param {String} textContent
 * @returns {Element}
 */
function polykit_create_element(
	tagName = "div",
	attributes = {},
	textContent = "",
) {
	const element = document.createElement(tagName);
	for (const attribute in attributes) {
		if (attributes.hasOwnProperty(attribute)) {
			element.setAttribute(attribute, attributes[attribute]);
		}
	}
	element.textContent = textContent;
	return element;
}

/**
 * Inserts adjacent elements to all target selectors.
 *
 * @param {String} target_selector This must be valid CSS syntax.
 * @param {('beforebegin' | 'afterbegin' | 'beforeend' | 'afterend')} el_position
 * @param {Element} new_element
 * @returns {void}
 */
function polykit_add_elements(target_selector, el_position, new_element) {
	document.querySelectorAll(target_selector).forEach((el) => {
		el.insertAdjacentElement(el_position, new_element.cloneNode(true));
	});
}

/**
 * Adds event listeners for all target selectors.
 *
 * @param {Event} event_name
 * @param {String} target_selector This must be valid CSS syntax.
 * @param {Function} function_to_call
 * @returns {void}
 */
function polykit_add_evt_listener(
	event_name,
	target_selector,
	function_to_call,
) {
	document.querySelectorAll(target_selector).forEach((el) => {
		el.addEventListener(event_name, function_to_call);
	});
}

/**
 * Copies text to clipboard.
 *
 * @param {String} copy_text
 * @returns {void}
 */
function polykit_copy_to_clipboard(copy_text) {
	navigator.clipboard.writeText(copy_text);
}

/**
 * If sourceElement is outside viewport, add classElement to targetElement.
 *
 * @param {Element} sourceElement
 * @param {Element} targetElement
 * @param {String} classElement
 * @return {void}
 */
function polykit_tag_target_when_source_outside_viewport(
	sourceElement,
	targetElement,
	classElement,
) {
	const target = document.querySelector(targetElement);
	if (!target) return;
	const observer = new IntersectionObserver((entries) => {
		if (true === entries[0].isIntersecting) {
			target.classList.remove(classElement);
		} else {
			target.classList.add(classElement);
		}
	}, { threshold: [1], rootMargin: "80px" });
	observer.observe(document.querySelector(sourceElement));
}

/**
 * Scroll to wporg header.
 *
 * @returns {void}
 */
function polykit_scroll_to_top() {
	document.querySelector("#masthead").scrollIntoView({
		block: "start",
		behavior: "smooth",
	});
}

/**
 * Generate the sticky header
 *
 * @returns {void}
 */
function polykit_build_sticky_header() {
	if (!polykit_user.is_on_translations) return;

	if (null === localStorage.getItem("polykit_header_is_sticky")) {
		localStorage.setItem("polykit_header_is_sticky", "true");
	}
	let polykit_header_is_sticky = "true" === localStorage.getItem("polykit_header_is_sticky");
	if (polykit_header_is_sticky) {
		document.body.classList.add("polykit-header-is-sticky");
	}

	const title = document.querySelector(".gp-content .breadcrumb+h2");
	const filter_toolbar = polykit_get_filter_toolbar();
	const bulk_actions = document.querySelector("#bulk-actions-toolbar-top");
	const polykit_review_toolbar = document.querySelector(
		".polykit-review-toolbar",
	);
	const paging_top = document.querySelector(".paging");
	const polykit_notices_container = document.querySelector(
		"#polykit-notices-container",
	);

	const toggle_sticky = document.createElement("DIV");
	toggle_sticky.id = "polykit-toggle-header";
	toggle_sticky.classList.add("polykit-toggle");
	const toggle_sticky_input = document.createElement("INPUT");
	toggle_sticky_input.id = "polykit-toggle-header-sticky";
	toggle_sticky_input.type = "checkbox";
	toggle_sticky_input.classList.add("polykit-toggle__input");
	toggle_sticky_input.checked = polykit_header_is_sticky ? "checked" : "";
	toggle_sticky_input.addEventListener("click", (e) => {
		polykit_header_is_sticky = !polykit_header_is_sticky;
		document.body.classList.toggle("polykit-header-is-sticky");
		localStorage.setItem(
			"polykit_header_is_sticky",
			(true === polykit_header_is_sticky) ? "true" : "false",
		);
		e.stopPropagation();
	});
	const toggle_sticky_label = document.createElement("LABEL");
	toggle_sticky_label.htmlFor = "polykit-toggle-header-sticky";
	toggle_sticky_label.classList.add("polykit-toggle__label");
	toggle_sticky_label.title = polykit_t("sticky_header_toggle");
	toggle_sticky &&
		toggle_sticky.append(toggle_sticky_input, toggle_sticky_label);

	const toolbar_extensions = polykit_ensure_toolbar_extensions();
	if (toolbar_extensions) {
		toolbar_extensions.prepend(toggle_sticky);
	}

	const fragment = document.createDocumentFragment();
	if (!toolbar_extensions) {
		toggle_sticky && fragment.appendChild(toggle_sticky);
	}
	title && fragment.appendChild(title);
	filter_toolbar && fragment.appendChild(filter_toolbar);
	bulk_actions && fragment.appendChild(bulk_actions);
	if (polykit_review_toolbar || paging_top) {
		const review_paging_row = document.createElement("div");
		review_paging_row.className = "polykit-review-paging-row";
		polykit_review_toolbar &&
			review_paging_row.appendChild(polykit_review_toolbar);
		paging_top && review_paging_row.appendChild(paging_top);
		fragment.appendChild(review_paging_row);
	}
	polykit_notices_container && fragment.appendChild(polykit_notices_container);

	const polykit_sticky_header_container = document.createElement("DIV");
	polykit_sticky_header_container.id = "polykit-sticky-header-container";
	polykit_sticky_header_container.appendChild(fragment);

	const polykit_sticky_header = document.createElement("DIV");
	polykit_sticky_header.id = "polykit-sticky-header";
	polykit_sticky_header.appendChild(polykit_sticky_header_container);
	const translations = document.querySelector("#translations");
	translations && translations.before(polykit_sticky_header);
}

/**
 * Copy the original string using Clipboard API
 *
 * @returns {void}
 */
function polykit_copy_visible_original_string() {
	polykit_copy_to_clipboard(
		document.querySelector('.editor[style="display: table-row;"] .original-raw')
			.innerHTML,
	);
}

/**
 * Adds an anonimous check next to the author filter field
 * @returns {void}
 */
function polykit_anonymous() {
	const user_filter_el = document.getElementById("filters[user_login]");
	if (!user_filter_el || document.getElementById("polykit-search-anonymous")) {
		return;
	}
	const anonymous = document.createElement("div");
	anonymous.className = "polykit-anonymous-filter";
	const anonymous_input = polykit_create_element("input", {
		"type": "checkbox",
		"id": "polykit-search-anonymous",
	});
	const anonymous_label = polykit_create_element("label", {
		"for": "polykit-search-anonymous",
	}, polykit_t("anonymous_author"));
	anonymous.append(anonymous_input, anonymous_label);
	const next = user_filter_el.nextElementSibling;
	if (next && "BR" === next.tagName) {
		next.before(anonymous);
	} else {
		user_filter_el.after(document.createElement("br"), anonymous);
	}
	anonymous_input.addEventListener("click", (event) => {
		if (event.target.checked) {
			document.getElementById("filters[user_login]").value = "anonymous";
			return;
		}
		document.getElementById("filters[user_login]").value = "";
	});
}

/**
 * Adds dropdown pagination
 * @returns {void}
 */
function polykit_pagination() {
	const default_pagination = document.querySelectorAll(".paging");
	if (!default_pagination.length) {
		return;
	}

	const pages = default_pagination[0].querySelectorAll("a");
	if (!pages.length) {
		return;
	}

	const last_page = {};
	if ("→" === pages[pages.length - 1].textContent) {
		last_page.id = parseInt(pages[pages.length - 2].textContent);
		last_page.url = pages[pages.length - 2].href;
	} else {
		last_page.id = parseInt(pages[pages.length - 1].textContent) + 1;
		last_page.url = pages[pages.length - 1].href;
	}

	const polykit_pagination = document.createElement("select");
	const option = document.createElement("option");
	polykit_pagination.className = "polykit-pagination";

	const current = parseInt(
		default_pagination[0].querySelector(".current").textContent,
	);

	for (let i = 1; i <= last_page.id; i++) {
		const this_option = option.cloneNode(true);
		this_option.value = i;
		this_option.textContent = i;
		if (i === current) {
			this_option.className = "current-page";
		}
		polykit_pagination.appendChild(this_option);
	}

	default_pagination.forEach((default_pagination_instance) => {
		const this_polykit_pagination = polykit_pagination.cloneNode(true);
		this_polykit_pagination.addEventListener("change", (ev) => {
			window.location = last_page.url.replace(
				/page=\d+/,
				`page=${ev.target.value}`,
			);
		});
		default_pagination_instance.insertAdjacentElement(
			"beforeend",
			this_polykit_pagination,
		);
	});

	document.querySelectorAll(".polykit-pagination .current-page").forEach(
		(el) => {
			el.selected = true;
		},
	);
}

/**
 * Counts the occurrences of a subString in a string
 * Algorithm by Vitim.us at https://gist.github.com/victornpb/7736865
 *
 * @param {String} string
 * @param {String} subString
 * @return {number}
 */
function polykit_occurrences(string, subString) {
	string = `${string.toLowerCase()}`;
	subString = `${subString.toLowerCase()}`;
	if (subString.length <= 0) return (string.length + 1);
	let n = 0, pos = 0;
	const step = subString.length;
	while (true) {
		pos = string.indexOf(subString, pos);
		if (pos >= 0) {
			++n;
			pos += step;
		} else break;
	}
	return n;
}

function polykit_check_for_URL(word, translatedText) {
	if (!word || !translatedText) return false;

	const lowerWord = word.toLowerCase();
	const textWithoutTags = translatedText.replace(/<[^>]*>/g, "");
	const fullURLRegex = /\b(?:https?|ftp):\/\/[^\s"'<>]+/gi;
	const partialPathRegex = /\b[a-zA-Z0-9\-_.\/]*wp-content\/plugins\/[^\s"'<>]*/gi;
	const matches = [
		...(textWithoutTags.match(fullURLRegex) || []),
		...(textWithoutTags.match(partialPathRegex) || []),
		textWithoutTags,
	];

	return matches.some((entry) => entry.toLowerCase().includes(lowerWord));
}
