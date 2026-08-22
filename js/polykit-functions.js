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
 * Parse JSON without throwing on corrupt storage.
 *
 * @param {string|null|undefined} value
 * @param {*} [fallback]
 * @returns {*}
 */
function polykit_parse_json(value, fallback = null) {
	if (null === value || undefined === value || "" === value) {
		return fallback;
	}
	if ("object" === typeof value) {
		return value;
	}
	try {
		return JSON.parse(value);
	} catch (_error) {
		return fallback;
	}
}

/**
 * @param {string} tagName
 * @returns {boolean}
 */
function polykit_is_trusted_inline_tag(tagName) {
	return "B" === tagName || "I" === tagName;
}

/**
 * Copy only <b> and <i> from a string; other tags become text.
 *
 * @param {string} html
 * @param {Document} [doc]
 * @returns {DocumentFragment}
 */
function polykit_trusted_inline_fragment(html, doc = document) {
	const fragment = doc.createDocumentFragment();
	const parsed = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
	const root = parsed.body && parsed.body.firstChild;
	if (!root) {
		fragment.appendChild(doc.createTextNode(String(html)));
		return fragment;
	}
	const walk = (node, target) => {
		node.childNodes.forEach((child) => {
			if (3 === child.nodeType) {
				target.appendChild(doc.createTextNode(child.nodeValue));
				return;
			}
			if (1 === child.nodeType && polykit_is_trusted_inline_tag(child.tagName)) {
				const el = doc.createElement(child.tagName.toLowerCase());
				walk(child, el);
				target.appendChild(el);
				return;
			}
			if (1 === child.nodeType) {
				walk(child, target);
			}
		});
	};
	walk(root, fragment);
	return fragment;
}

/**
 * First translation string from a glossary-word data payload.
 *
 * @param {*} info
 * @returns {string}
 */
function polykit_glossary_translation_from_data(info) {
	if (!info || !info[0] || "string" !== typeof info[0].translation) {
		return "";
	}
	return info[0].translation;
}

/**
 * @param {string} word
 * @returns {string}
 */
function polykit_glossary_consistency_url(word) {
	return `https://translate.wordpress.org/consistency?search=${
		encodeURIComponent(word)
	}&set=${polykit_get_lang_consistency()}%2Fdefault`;
}

/**
 * @param {string[]} hrefs
 * @returns {{permalink: string, history: string, consistency: string, discussion: string}|null}
 */
function polykit_quicklink_hrefs_from_menu(hrefs) {
	if (!hrefs || hrefs.length < 4) {
		return null;
	}
	const history = hrefs[1].includes("historypage") ? hrefs[1] : `${hrefs[1]}&historypage`;
	return {
		permalink: hrefs[0],
		history,
		consistency: `${hrefs[2]}&consistencypage`,
		discussion: hrefs[3],
	};
}

const polykit_editor_added_hooks = [];

/**
 * @param {Function} callback
 * @returns {void}
 */
function polykit_register_editor_added(callback) {
	if ("function" === typeof callback) {
		polykit_editor_added_hooks.push(callback);
	}
}

/**
 * @param {Element} editor
 * @returns {void}
 */
function polykit_notify_editor_added(editor) {
	polykit_editor_added_hooks.forEach((callback) => {
		callback(editor);
	});
}

/**
 * PolyKit is Japanese-only; always return ja.
 *
 * @returns {string}
 */
function polykit_get_lang() {
	return "ja";
}

/**
 * Add links for Translation global status and Language projects archive
 * @returns void
 */
function polykit_add_project_links() {
	const heading = document.querySelector(".gp-content h2");
	const breadcrumb_items = document.querySelectorAll(".gp-content .breadcrumb li");
	const last_link = document.querySelector(".gp-content .breadcrumb li:last-child a");
	if (!heading || breadcrumb_items.length <= 3 || !last_link) {
		return;
	}
	const href_parts = (last_link.getAttribute("href") || "").split("/");
	const lang = sanitize_value(href_parts[href_parts.length - 3] || "");
	if (!lang) {
		return;
	}

	const titleLinksContainer = document.createElement("span");
	titleLinksContainer.id = "polykit-title-links";

	const locale_link = document.createElement("a");
	locale_link.className = "glossary-link";
	locale_link.href = `https://translate.wordpress.org/locale/${encodeURIComponent(lang)}/default`;
	locale_link.target = "_blank";
	locale_link.rel = "noreferrer noopener";
	locale_link.textContent = `${last_link.textContent} ${polykit_t("projects_suffix")}`;

	const stats_link = document.createElement("a");
	stats_link.className = "glossary-link";
	stats_link.href = "https://translate.wordpress.org/stats";
	stats_link.target = "_blank";
	stats_link.rel = "noreferrer noopener";
	stats_link.textContent = polykit_t("translation_global_status");

	titleLinksContainer.append(locale_link, stats_link);
	heading.appendChild(titleLinksContainer);

	const glossaryLinks = document.querySelector(".gp-heading>h2+.glossary-links");
	if (glossaryLinks) {
		titleLinksContainer.append(glossaryLinks);
	}
	document.querySelector("#polykit-title-links .glossary-links .separator")
		?.remove();
}

/**
 * Add links to glossary words
 *
 * @param {object} glossary_word node
 * @returns void
 */
function polykit_add_glossary_links(glossary_word) {
	if (
		!glossary_word ||
		!glossary_word.parentNode ||
		glossary_word.closest("a[href*='consistency?search']")
	) {
		return;
	}
	const link = document.createElement("a");
	link.href = polykit_glossary_consistency_url(glossary_word.textContent || "");
	link.target = "_blank";
	link.rel = "noreferrer noopener";
	glossary_word.parentNode.insertBefore(link, glossary_word);
	link.appendChild(glossary_word);
}

/**
 * Ensure the review toolbar container exists next to the filter toolbar.
 *
 * @returns {HTMLElement|null}
 */
function polykit_ensure_review_toolbar() {
	const existing = document.querySelector(".polykit-review-toolbar");
	if (existing) {
		polykit_ensure_notices_container(existing);
		return existing;
	}
	const filter_toolbar = polykit_get_filter_toolbar();
	if (!filter_toolbar) {
		return null;
	}
	const review_toolbar = document.createElement("div");
	review_toolbar.className = "polykit-review-toolbar";
	filter_toolbar.insertAdjacentElement("afterend", review_toolbar);
	polykit_ensure_notices_container(review_toolbar);
	return review_toolbar;
}

/**
 * 通知コンテナを用意し、可能ならレビューツールバー内へ置く。
 *
 * @param {HTMLElement} [toolbar]
 * @returns {HTMLElement}
 */
function polykit_ensure_notices_container(toolbar) {
	let container = document.querySelector("#polykit-notices-container");
	if (!container) {
		container = document.createElement("div");
		container.id = "polykit-notices-container";
	}
	const host = toolbar || document.querySelector(".polykit-review-toolbar");
	if (host) {
		if (container.parentNode !== host) {
			host.appendChild(container);
		}
		return container;
	}
	if (!container.parentNode) {
		document.querySelector("#translations")?.before(container);
	}
	return container;
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
			const notices = review_toolbar.querySelector("#polykit-notices-container");
			const insert_before = notices;
			if (insert_before) {
				review_toolbar.insertBefore(review_button, insert_before);
			} else {
				review_toolbar.appendChild(review_button);
			}
		}
	}
}

/**
 * Add the buttons to scroll to the Japanese locale row
 * @returns void
 */
function polykit_add_scroll_buttons() {
	if (document.querySelector(".polykit-scroll")) {
		return;
	}
	const locations = [
		/https:\/\/translate\.wordpress\.org\/stats\/$/,
		/https:\/\/translate\.wordpress\.org\/projects\/[^/]+\/[^/]+\/$/,
		/https:\/\/translate\.wordpress\.org\/projects\/apps\/[^/]+\/[^/]+\/$/,
	];
	const position = document.querySelector("table");
	if (!position || !locations.some((regex) => regex.test(window.location.href))) {
		return;
	}

	const button = document.createElement("button");
	button.type = "button";
	button.className = "polykit-scroll";
	button.textContent = polykit_t("scroll_to");
	position.before(button);

	const stats_link = Array.from(
		document.querySelectorAll(".stats-table tbody tr th a"),
	).find((el) => "ja" === el.textContent.trim());

	button.addEventListener("click", () => {
		const target = stats_link ||
			document.querySelector('table tr th a[href*="/ja/"]') ||
			document.querySelector('table td strong a[href*="/ja/"]');
		if (!target) {
			return;
		}
		const row = target.closest("tr");
		if (!row) {
			return;
		}
		row.style.border = "2px solid black";
		target.style.color = "#a70505";
		if (!target.textContent.includes("➤")) {
			target.textContent = `➤ ${target.textContent}`;
		}
		row.scrollIntoView({ block: "start", behavior: "smooth" });
	});
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
 * @param {Element} el
 * @param {Function} [compute_style]
 * @returns {boolean}
 */
function polykit_is_displayed_editor(el, compute_style) {
	if (!el || !el.classList || !el.classList.contains("editor")) {
		return false;
	}
	const view = el.ownerDocument?.defaultView ||
		(typeof window !== "undefined" ? window : null);
	const style = compute_style
		? compute_style(el)
		: (view && view.getComputedStyle
			? view.getComputedStyle(el)
			: { display: el.style?.display || "", visibility: "" });
	return "none" !== style.display && "hidden" !== style.visibility;
}

/**
 * Currently open translation editor row.
 *
 * @param {ParentNode} [root]
 * @param {Function} [compute_style]
 * @returns {HTMLElement|null}
 */
function polykit_get_visible_editor(root = document, compute_style) {
	const editors = root.querySelectorAll(".editor");
	for (const editor of editors) {
		if (polykit_is_displayed_editor(editor, compute_style)) {
			return editor;
		}
	}
	return null;
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
 * Get Global Handbook URL for current locale and populates polykit_glossary global constant
 * Don't check if handbook exists
 *
 * @return void
 */
function polykit_get_handbook_link() {
	polykit_glossary.handbook_url = "https://ja.wordpress.org/team/handbook/";
}

/**
 * Get Global Glossary URL for current locale
 * Don't check if it exists
 *
 * @return string Global glossary URL
 */
function polykit_get_global_glossary_url() {
	return "https://translate.wordpress.org/locale/ja/default/glossary/";
}

/**
 * Get Locale glossary page HTML, treat data and populate polykit_glossary global constant
 *
 * @return string HTML of glossary page
 */
function polykit_get_glossary_global_data() {
	polykit_get_handbook_link();
	const global_glossary_url = polykit_get_global_glossary_url();

	fetch(global_glossary_url)
		.then((response) => response.text())
		.then((glossary_data) => {
			polykit_glossary.glossary_url = global_glossary_url;
			return glossary_data;
		})
		.then((glossary_data) => {
			polykit_extract_glossary_data(glossary_data);
		})
		.catch(() => {
			// Glossary page unavailable; continue without glossary metadata.
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
		const description_data = `<div>${glossary_description[0]}</div>`;
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
 * Consistency tool locale slug (Japanese only).
 *
 * @returns {string}
 */
function polykit_get_lang_consistency() {
	return "ja";
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
 * Move the current locale first on Translate homepage.
 *
 * @returns {void}
 */
function polykit_current_locale_first() {
	if ("https://translate.wordpress.org/" !== document.URL) return;
	const locales_filter = document.querySelector("#locales-filter");
	const current_locale = document.querySelector(
		'#locales .english a[href="/locale/ja/"]',
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
	if (
		!next_editor ||
		!next_editor.classList.contains("editor") ||
		!preview.classList.contains("preview")
	) {
		return;
	}
	next_editor.style.display = "none";
	preview.style.display = "table-row";
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
					const previous = 1 === mutation.previousSibling?.nodeType ? mutation.previousSibling : null;
					const is_new_translation = previous &&
						previous.matches(".editor.untranslated");
					let status_has_changed = false;
					if (
						row_is_editor && previous &&
						previous.matches('[class*="status-"]')
					) {
						const status_before = /status-[a-z]*/.exec(
							previous.className,
						);
						const status_after = /status-[a-z]*/.exec(addedNode.className);
						status_has_changed = null !== status_before &&
							null !== status_after &&
							status_before[0] !== status_after[0];
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
						polykit_localize_date(editor_id);
						polykit_search_init(editor_id);
						polykit_google_translate_init(editor_id);
						polykit_notify_editor_added(addedNode);
					}
				});
			});
		});

		observer.observe(document.querySelector("#translations tbody"), {
			childList: true,
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
	if (!copy_text || !navigator.clipboard) {
		return;
	}
	navigator.clipboard.writeText(copy_text).catch(() => {
		// Clipboard can be denied; ignore.
	});
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
	const source = document.querySelector(sourceElement);
	if (!target || !source) return;
	const observer = new IntersectionObserver((entries) => {
		if (true === entries[0].isIntersecting) {
			target.classList.remove(classElement);
		} else {
			target.classList.add(classElement);
		}
	}, { threshold: [1], rootMargin: "80px" });
	observer.observe(source);
}

/**
 * Scroll to wporg header.
 *
 * @returns {void}
 */
function polykit_scroll_to_top() {
	const masthead = document.querySelector("#masthead");
	if (!masthead) return;
	masthead.scrollIntoView({
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

	if (polykit_get_setting("header_is_sticky")) {
		document.body.classList.add("polykit-header-is-sticky");
	}

	const title = document.querySelector(".gp-content .breadcrumb+h2");
	const filter_toolbar = polykit_get_filter_toolbar();
	const bulk_actions = document.querySelector("#bulk-actions-toolbar-top");
	const polykit_review_toolbar = document.querySelector(
		".polykit-review-toolbar",
	);
	const paging_top = document.querySelector(".paging");

	const fragment = document.createDocumentFragment();
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
	const original = polykit_query_visible_editor(".original-raw");
	if (original) {
		polykit_copy_to_clipboard(original.textContent);
	}
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

/**
 * Count glossary translations, treating the wave dash as a wildcard.
 *
 * @param {string} translatedText
 * @param {string} glossaryTranslation
 * @returns {number}
 */
function polykit_glossary_translation_occurrences(
	translatedText,
	glossaryTranslation,
) {
	if (
		!translatedText || !glossaryTranslation ||
		!glossaryTranslation.includes("〜")
	) {
		return polykit_occurrences(translatedText, glossaryTranslation);
	}

	const parts = glossaryTranslation.split("〜");
	if (!parts.some((part) => "" !== part)) {
		return polykit_occurrences(translatedText, glossaryTranslation);
	}
	const escaped = parts.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
	const pattern = escaped.join("[\\s\\S]+?");
	return (String(translatedText).match(new RegExp(pattern, "gi")) || []).length;
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

/**
 * Alternates the translation page title with the plugin name and release channel.
 *
 * @param {Document} page_document
 * @param {Location} page_location
 * @param {Function} schedule
 * @returns {number|null}
 */
function polykit_start_alternating_plugin_title(
	page_document = document,
	page_location = window.location,
	schedule = window.setInterval,
) {
	const path_match = page_location.pathname.match(
		/^\/projects\/wp-plugins\/([^/]+)\/(stable|dev)(?:-readme)?\/[^/]+\/[^/]+\/?$/,
	);
	if (!path_match) return null;

	const plugin_path = `/projects/wp-plugins/${path_match[1]}/`;
	const plugin_link = Array.from(
		page_document.querySelectorAll(".breadcrumb a"),
	).find((link) => link.getAttribute("href") === plugin_path);
	const plugin_name = plugin_link?.textContent.trim();
	if (!plugin_name) return null;

	const original_title = page_document.title;
	const channel = "stable" === path_match[2] ? "Stable" : "Dev";
	const plugin_title = `${plugin_name} (${channel})`;
	let show_plugin_title = false;

	return schedule(() => {
		show_plugin_title = !show_plugin_title;
		page_document.title = show_plugin_title ? plugin_title : original_title;
	}, 3000);
}
