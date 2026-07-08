const polykit_user = {
	is_translator: false,
	is_editor: false,
	is_connected: false,
	is_on_translations: false,
	is_gte: false,
};

if (
	("undefined" !== typeof $gp_editor_options) &&
	"" === $gp_editor_options.can_approve
) {
	document.body.classList.add(
		"polykit-user-is-translator",
		"polykit-on-translations",
	);
	polykit_user.is_translator = true;
	polykit_user.is_on_translations = true;
}
if (
	("undefined" !== typeof $gp_editor_options) &&
	"1" === $gp_editor_options.can_approve
) {
	document.body.classList.add(
		"polykit-user-is-editor",
		"polykit-on-translations",
	);
	polykit_user.is_editor = true;
	polykit_user.is_on_translations = true;
}
polykit_user.is_connected = document.querySelector("body.logged-in") !== null;

document.querySelector("#menu-headline-nav").insertAdjacentHTML(
	"beforeend",
	'<li class="polykit-setting" style="cursor:pointer;"><a> PolyKit</a></li>',
);
document.querySelector(".polykit-setting").prepend(
	document.querySelector(".polykit-icon"),
);
document.querySelector(".polykit-icon").style.display = "";

const polykit_settings_menu = document.querySelector(".polykit-setting");
polykit_settings_menu && polykit_settings_menu.addEventListener("click", () => {
	if (
		document.body.classList.contains("polykit-settings-on-screen") &&
		"0" !== polykit_extension.previousVersion
	) {
		polykit_extension.previousVersion = polykit_extension.currentVersion;
		localStorage.setItem(
			"polykit_extension_status",
			JSON.stringify(polykit_extension),
		);
	}
	document.body.classList.toggle("polykit-settings-on-screen");
	polykit_generate_settings_panel();
});

function polykit_generate_settings_panel() {
	const polykit_settings = document.querySelector(".polykit-settings");
	if (null !== polykit_settings) {
		polykit_settings.style.display = ("none" === polykit_settings.style.display) ? "" : "none";
		return;
	}

	// Use [[[ code ]]] markdown for symbols and add * at the end of the setting's description if needed.
	const general_checks_group = {
		groupTitle: "settings_group_general_checks",
		groupIntro: "settings_group_general_checks_intro",
		groupClass: "polykit-settings-group--general",
		categories: [
			{
				title: "checks_behavior_title",
				controlColumn: "enabled",
				settings: {
					checks_enabled: polykit_t("setting_checks_enabled"),
					checks_labels: polykit_t("setting_checks_labels"),
					checks_block_notices: polykit_t("setting_checks_block_notices"),
				},
			},
			{
				title: "custom_checks_title",
				controlColumn: "value",
				textFields: [
					{
						id: "warning_words",
						label: polykit_t("setting_warning_words"),
						placeholder: polykit_t("setting_words_placeholder"),
					},
					{
						id: "match_words",
						label: polykit_t("setting_match_words"),
						placeholder: polykit_t("setting_words_placeholder"),
					},
				],
			},
			{
				title: "hide_warnings_title",
				controlColumn: "hidden",
				settings: {
					no_glossary_term_check: polykit_t("setting_no_glossary_term_check"),
					no_initial_uppercase: polykit_t("setting_no_initial_uppercase"),
					no_initial_space: polykit_t("setting_no_initial_space"),
					no_trailing_space: polykit_t("setting_no_trailing_space"),
					no_final_dot: polykit_t("setting_no_final_dot"),
					no_final_other_dots: polykit_t("setting_no_final_other_dots"),
				},
			},
		],
	};

	const ja_style_guide_group = {
		groupTitle: "settings_group_ja_style_guide",
		groupIntro: "settings_group_ja_style_guide_intro",
		groupClass: "polykit-settings-group--ja-style",
		categories: [
			{
				title: "ja_style_section1_title",
				controlColumn: "enabled",
				settings: {
					ja_japanese_punctuation: polykit_t(
						"setting_ja_japanese_punctuation",
					),
					ja_fullwidth_ascii: polykit_t("setting_ja_fullwidth_ascii"),
					curly_apostrophe_warning: polykit_t(
						"setting_curly_apostrophe_warning",
					),
					ja_space_before_half: polykit_t("setting_ja_space_before_half"),
					ja_fullwidth_number: polykit_t("setting_ja_fullwidth_number"),
					ja_space_around_mixed: polykit_t("setting_ja_space_around_mixed"),
					ja_space_after_comma: polykit_t("setting_ja_space_after_comma"),
					ja_colon_spacing: polykit_t("setting_ja_colon_spacing"),
					ja_paren_space_outside: polykit_t("setting_ja_paren_space_outside"),
					ja_paren_space_inside: polykit_t("setting_ja_paren_space_inside"),
					ja_paren_period_before_close: polykit_t(
						"setting_ja_paren_period_before_close",
					),
					ja_digit_spacing: polykit_t("setting_ja_digit_spacing"),
				},
			},
			{
				title: "ja_style_section2_title",
				controlColumn: "enabled",
				settings: {
					ja_straight_quotes: polykit_t("setting_ja_straight_quotes"),
					localized_quote_warning: polykit_t("setting_localized_quote_warning"),
				},
			},
			{
				title: "ja_style_section3_title",
				controlColumn: "enabled",
				settings: {
					ja_view_terminology: polykit_t("setting_ja_view_terminology"),
					ja_not_allowed_terminology: polykit_t(
						"setting_ja_not_allowed_terminology",
					),
					ja_sorry_terminology: polykit_t("setting_ja_sorry_terminology"),
					ja_terminology: polykit_t("setting_ja_terminology"),
				},
			},
		],
	};

	const tools_group = {
		groupTitle: "tools_title",
		groupClass: "polykit-settings-group--tools",
		categories: [
			{
				title: "tools_features_title",
				controlColumn: "enabled",
				settings: {
					search_enabled: polykit_t("setting_search_enabled"),
					google_translate: polykit_t("setting_google_translate"),
					shortcuts_alt: polykit_t("setting_shortcuts_alt"),
					editor_scroll_center: polykit_t("setting_editor_scroll_center"),
					prevent_unsaved: polykit_t("setting_prevent_unsaved"),
					history_main: polykit_t("setting_history_main"),
					history_count: polykit_t("setting_history_count"),
					history_page: polykit_t("setting_history_page"),
				},
			},
			{
				title: "others_title",
				controlColumn: "enabled",
				settings: {
					no_non_breaking_space: polykit_t("setting_no_non_breaking_space"),
					autocopy_string_on_translation_opened: polykit_t("setting_autocopy"),
					autosubmit_bulk_copy_from_original: polykit_t(
						"setting_autosubmit_bulk",
					),
					force_autosubmit_bulk_copy_from_original: polykit_t(
						"setting_force_autosubmit_bulk",
					),
				},
			},
		],
	};

	const hotkeys = {
		[polykit_t("hk_glossary_rightclick")]: polykit_t(
			"hk_glossary_rightclick_key",
		),
		[polykit_t("hk_space_boundary")]: "Ctrl+Shift+X",
		[polykit_t("hk_wrap_corner")]: "Ctrl+Shift+[",
		[polykit_t("hk_wrap_double_corner")]: "Ctrl+Shift+]",
		[polykit_t("hk_approve")]: "Ctrl+Shift+A",
		[polykit_t("hk_cancel")]: "Ctrl+Shift+Z",
		[polykit_t("hk_copy_original")]: "Ctrl+Shift+B",
		[polykit_t("hk_dismiss_current")]: "Ctrl+D",
		[polykit_t("hk_dismiss_all")]: "Ctrl+Shift+D",
		[polykit_t("hk_force_save")]: "Ctrl+Shift+Enter",
		[polykit_t("hk_fuzzy")]: "Ctrl+Shift+F",
		[polykit_t("hk_consistency")]: "Alt+C",
		[polykit_t("hk_consistency_num")]: "Alt+1〜9",
		[polykit_t("hk_google_translate")]: "Alt+G",
		[polykit_t("hk_notranslate_all")]: "Alt+N",
		[polykit_t("hk_search_focus")]: "Alt+S / Alt+P",
		[polykit_t("hk_next")]: "Page Down",
		[polykit_t("hk_prev")]: "Page Up",
		[polykit_t("hk_reject")]: "Ctrl+Shift+R",
		[polykit_t("hk_save")]: "Ctrl+Enter",
	};

	const container = document.createElement("DIV");
	container.classList.add("polykit-settings");

	const asterisk = document.createElement("SPAN");
	asterisk.classList.add("polykit-asterisk");
	asterisk.textContent = "*";

	const tab_defs = [
		{
			slug: "general",
			label: polykit_t("settings_tab_general"),
			render: (panel) => {
				polykit_append_settings_group(
					panel,
					general_checks_group,
					asterisk,
					{ showTitle: false },
				);
			},
		},
		{
			slug: "ja-style",
			label: polykit_t("settings_tab_ja_style"),
			render: (panel) => {
				polykit_append_settings_group(
					panel,
					ja_style_guide_group,
					asterisk,
					{ showTitle: false },
				);
			},
		},
		{
			slug: "tools",
			label: polykit_t("tools_title"),
			render: (panel) => {
				if (polykit_user.is_gte) {
					tools_group.categories.unshift({
						title: "bulk_consistency_title",
						controlColumn: "enabled",
						settings: {
							bulk_consistency: polykit_t("setting_bulk_consistency"),
						},
					});
				}
				polykit_append_settings_group(
					panel,
					tools_group,
					asterisk,
					{ showTitle: false },
				);
				const caution_note = document.createElement("SPAN");
				caution_note.style.fontWeight = "bold";
				caution_note.style.margin = "1em 0 .2em";
				caution_note.append(asterisk.cloneNode(true), polykit_t("caution_note"));
				panel.appendChild(caution_note);
				const backup_note = document.createElement("P");
				const backup_link = document.createElement("A");
				backup_link.id = "polykit-backup";
				backup_link.href = "#";
				backup_link.textContent = polykit_t("backup_settings");
				backup_link.title = polykit_t("backup_settings_hint");
				backup_note.append(
					backup_link,
					document.createTextNode(` ${polykit_t("backup_settings_note")}`),
				);
				panel.appendChild(backup_note);
				backup_link.addEventListener("mousedown", (ev) => {
					ev.preventDefault();
					const settings = {};
					for (let i = 0; i < localStorage.length; i++) {
						const key = localStorage.key(i);
						if (key && key.startsWith("polykit_")) {
							settings[key] = localStorage.getItem(key);
						}
					}
					ev.target.href = `javascript:(function(){const s=${
						JSON.stringify(settings)
					};Object.keys(s).forEach(k=>localStorage.setItem(k,s[k]));alert("${
						polykit_t("backup_restored")
					}");})();`;
				});
				backup_link.addEventListener("click", () => {
					alert(polykit_t("backup_restore_hint"));
				});
			},
		},
		{
			slug: "hotkeys",
			label: polykit_t("hotkeys_title"),
			render: (panel) => {
				const hotkeysFragment = document.createDocumentFragment();
				const hotkeysHeader = document.createElement("TR");
				hotkeysHeader.appendChild(document.createElement("TH")).appendChild(
					document.createTextNode(polykit_t("settings_col_item")),
				);
				hotkeysHeader.appendChild(document.createElement("TH")).appendChild(
					document.createTextNode(polykit_t("hotkey_key")),
				);
				hotkeysFragment.appendChild(hotkeysHeader);
				Object.entries(hotkeys).forEach((hotkey) => {
					const [key, value] = hotkey;
					const tr = document.createElement("TR");
					tr.appendChild(document.createElement("TD")).appendChild(
						document.createTextNode(`${key}`),
					);
					tr.appendChild(document.createElement("TD")).appendChild(
						document.createTextNode(`${value}`),
					);
					hotkeysFragment.appendChild(tr);
				});
				const hotkeysTable = document.createElement("TABLE");
				hotkeysTable.classList.add("polykit-settings-table");
				hotkeysTable.appendChild(hotkeysFragment);
				panel.appendChild(hotkeysTable);
			},
		},
		{
			slug: "welcome",
			label: polykit_t("welcome_tab_install"),
			render: (panel) => {
				const changelog = document.createElement("DIV");
				changelog.classList.add("polykit-changelog");
				const currentVersion = "0" === polykit_extension.currentVersion ? "" : polykit_extension.currentVersion;
				changelog.appendChild(document.createElement("H3")).appendChild(
					document.createTextNode(
						polykit_t("welcome_install_title", currentVersion),
					),
				);
				const quickLinks = document.createElement("DIV");
				quickLinks.classList.add("polykit-settings-quicklinks");
				quickLinks.innerHTML =
					`<p><a href="https://ja.wordpress.org/team/handbook/translation/" target="_blank" rel="noreferrer noopener">${
						polykit_t("handbook_link")
					}</a> | <a href="https://ja.wordpress.org/team/handbook/translation/translation-style-guide/" target="_blank" rel="noreferrer noopener">${
						polykit_t("style_guide_link")
					}</a> | <a href="https://translate.wordpress.org/locale/ja/default/glossary/" target="_blank" rel="noreferrer noopener">${
						polykit_t("glossary_link")
					}</a></p>`;
				changelog.appendChild(quickLinks);
				changelog.appendChild(document.createElement("P")).appendChild(
					document.createTextNode(polykit_t("welcome_install_intro")),
				);
				const ul = document.createElement("UL");
				Object.values({
					1: polykit_t("welcome_advice_1"),
					2: polykit_t("welcome_advice_2"),
					3: polykit_t("welcome_advice_3"),
				}).forEach((advice) => {
					ul.appendChild(document.createElement("LI")).appendChild(
						document.createTextNode(advice),
					);
				});
				changelog.appendChild(ul);
				changelog.appendChild(document.createElement("P")).appendChild(
					document.createTextNode(polykit_t("welcome_enjoy")),
				);

				const has_changelog = Boolean(
					polykit_extension.changelog &&
						"" !== polykit_extension.changelog.trim(),
				);
				if (has_changelog || "update" === polykit_extension.reason) {
					changelog.appendChild(document.createElement("H3")).appendChild(
						document.createTextNode(
							polykit_t("welcome_update_title", currentVersion),
						),
					);
					if (has_changelog) {
						changelog.appendChild(document.createElement("DIV")).appendChild(
							document.createTextNode(polykit_extension.changelog),
						);
					}
					const link = document.createElement("A");
					link.href = "https://github.com/hiroshisatoy/polykit/blob/main/CHANGELOG.md";
					link.textContent = polykit_t("check_changelog");
					link.target = "_blank";
					link.rel = "noreferrer noopener";
					changelog.appendChild(link);
				}
				panel.appendChild(changelog);
			},
		},
	];

	polykit_build_settings_tabs(container, tab_defs);
	document.querySelector(".gp-content").prepend(container);
}

/**
 * Create the settings panel close control.
 *
 * @returns {HTMLAnchorElement}
 */
function polykit_create_settings_close_button() {
	const closeSettings = document.createElement("A");
	closeSettings.classList.add("polykit-close-settings");
	closeSettings.href = "#";
	const icon = document.createElement("SPAN");
	icon.classList.add("polykit-close-settings__icon");
	icon.setAttribute("aria-hidden", "true");
	icon.textContent = "\u00D7";
	closeSettings.append(icon, document.createTextNode(polykit_t("close")));
	closeSettings.addEventListener("click", (event) => {
		event.preventDefault();
		polykit_settings_menu.click();
	});
	return closeSettings;
}

/**
 * Build settings tabs, radio inputs, and panels.
 *
 * @param {HTMLElement} container
 * @param {object[]} tab_defs
 * @returns {void}
 */
function polykit_build_settings_tabs(container, tab_defs) {
	const tabs = document.createElement("DIV");
	tabs.classList.add("polykit-settings-tabs");
	const panels = document.createElement("DIV");
	panels.classList.add("polykit-settings-panels");
	const style_rules = [];

	tab_defs.forEach((tab_def, index) => {
		const tab_index = index + 1;
		const radio = document.createElement("INPUT");
		radio.classList.add("polykit-settings__radio");
		radio.type = "radio";
		radio.name = "polykit-settings-group";
		radio.id = `polykit-settings__radio${tab_index}`;
		if (0 === index) {
			radio.checked = true;
		}

		const tab = document.createElement("LABEL");
		tab.classList.add("polykit-settings-tab");
		tab.id = `polykit-settings-tab-${tab_def.slug}`;
		tab.dataset.polykitSettingsTab = tab_def.slug;
		tab.htmlFor = radio.id;
		tab.textContent = tab_def.label;

		const panel = document.createElement("DIV");
		panel.classList.add("polykit-settings-panel");
		panel.id = `polykit-settings-panel${tab_index}`;
		panel.dataset.polykitSettingsPanel = tab_def.slug;
		panel.appendChild(polykit_create_settings_close_button());
		const panel_title = document.createElement("H2");
		panel_title.classList.add("polykit-settings-panel__title");
		panel_title.textContent = tab_def.label;
		panel.appendChild(panel_title);
		tab_def.render(panel);

		container.appendChild(radio);
		tabs.appendChild(tab);
		panels.appendChild(panel);

		style_rules.push(
			`#${radio.id}:checked ~ .polykit-settings-tabs #${tab.id}{background:var(--polykit-color-settings-tab-active-bg);color:var(--polykit-color-text);font-weight:600;border-color:var(--polykit-color-border);border-bottom:1px solid var(--polykit-color-settings-tab-active-bg);margin-bottom:-1px;}`,
			`#${radio.id}:checked ~ .polykit-settings-panels #${panel.id}{display:flex;}`,
		);
	});

	container.appendChild(tabs);
	container.appendChild(panels);

	let style_el = document.getElementById("polykit-settings-tab-styles");
	if (!style_el) {
		style_el = document.createElement("STYLE");
		style_el.id = "polykit-settings-tab-styles";
		document.head.appendChild(style_el);
	}
	style_el.textContent = style_rules.join("\n");
}

const polykit_setting_defaults = {
	checks_enabled: true,
	checks_labels: true,
	checks_block_notices: false,
	search_enabled: true,
	google_translate: true,
	shortcuts_alt: true,
	editor_scroll_center: true,
	prevent_unsaved: true,
	history_main: true,
	history_count: true,
	history_page: true,
	bulk_consistency: false,
	no_initial_uppercase: true,
	no_final_dot: true,
	curly_apostrophe_warning: false,
	localized_quote_warning: false,
	ja_japanese_punctuation: true,
	ja_fullwidth_ascii: true,
	ja_fullwidth_number: true,
	ja_space_before_half: true,
	ja_space_around_mixed: true,
	ja_space_after_comma: true,
	ja_colon_spacing: true,
	ja_digit_spacing: true,
	ja_paren_space_outside: true,
	ja_paren_space_inside: true,
	ja_paren_period_before_close: true,
	ja_terminology: true,
	ja_view_terminology: true,
	ja_not_allowed_terminology: true,
	ja_sorry_terminology: true,
	ja_straight_quotes: true,
};

/**
 * Append a top-level settings group (general checks, JA style guide, tools).
 *
 * @param {DocumentFragment|HTMLElement} parent
 * @param {object} group
 * @param {HTMLSpanElement} asterisk
 * @param {object} [options]
 * @param {boolean} [options.showTitle]
 * @returns {void}
 */
function polykit_append_settings_group(parent, group, asterisk, options = {}) {
	const showTitle = false !== options.showTitle;
	const section = document.createElement("SECTION");
	section.classList.add("polykit-settings-group", group.groupClass);

	if (showTitle) {
		section.appendChild(document.createElement("H2")).appendChild(
			document.createTextNode(polykit_t(group.groupTitle)),
		);
	}
	if (group.groupIntro) {
		const intro = document.createElement("P");
		intro.classList.add("polykit-settings-group__intro");
		intro.textContent = polykit_t(group.groupIntro);
		section.appendChild(intro);
	}

	const inner = document.createDocumentFragment();
	group.categories.forEach((category) => {
		polykit_append_settings_category(inner, category, asterisk);
	});
	section.appendChild(inner);
	parent.appendChild(section);
}

/**
 * @param {string} controlColumn
 * @returns {HTMLTableElement}
 */
function polykit_create_settings_table(controlColumn) {
	const table = document.createElement("TABLE");
	table.classList.add("polykit-settings-table");
	const thead = document.createElement("THEAD");
	const headerRow = document.createElement("TR");
	headerRow.appendChild(document.createElement("TH")).appendChild(
		document.createTextNode(polykit_t("settings_col_item")),
	);
	const controlHeader = polykit_t(
		`settings_col_${controlColumn || "enabled"}`,
	);
	headerRow.appendChild(document.createElement("TH")).appendChild(
		document.createTextNode(controlHeader),
	);
	thead.appendChild(headerRow);
	table.append(thead, document.createElement("TBODY"));
	return table;
}

/**
 * @param {HTMLTableCellElement} cell
 * @param {string} text
 * @param {HTMLSpanElement} asterisk
 * @returns {void}
 */
function polykit_fill_settings_description_cell(cell, text, asterisk) {
	let desc = text;
	let has_asterisk = false;
	if ("*" === desc.slice(-1)) {
		has_asterisk = true;
		desc = desc.slice(0, -1);
	}
	const wrapper = document.createElement("DIV");
	wrapper.classList.add("polykit-settings-table__desc-text");
	polykit_append_setting_label_content(wrapper, desc);
	cell.appendChild(wrapper);
	if (has_asterisk) {
		cell.appendChild(asterisk.cloneNode(true));
	}
}

/**
 * @param {DocumentFragment|HTMLElement} parent
 * @param {object} category
 * @param {HTMLSpanElement} asterisk
 * @returns {void}
 */
function polykit_append_settings_category(parent, category, asterisk) {
	parent.appendChild(document.createElement("H3")).appendChild(
		document.createTextNode(polykit_t(category.title)),
	);
	const controlColumn = category.controlColumn || "enabled";
	const table = polykit_create_settings_table(controlColumn);
	const tbody = table.querySelector("tbody");

	if (category.settings) {
		Object.entries(category.settings).forEach((setting) => {
			const setting_slug = setting[0];
			const setting_desc = setting[1];
			const row = document.createElement("TR");
			const descCell = document.createElement("TD");
			descCell.classList.add("polykit-settings-table__desc");
			polykit_fill_settings_description_cell(descCell, setting_desc, asterisk);
			const controlCell = document.createElement("TD");
			controlCell.classList.add("polykit-settings-table__control");
			const input = document.createElement("INPUT");
			input.type = "checkbox";
			input.id = `polykit_${setting_slug}`;
			input.checked = polykit_get_setting(setting_slug);
			input.setAttribute(
				"aria-label",
				polykit_t(`settings_col_${controlColumn}`),
			);
			input.addEventListener("click", (event) => {
				localStorage.setItem("polykit_" + setting_slug, event.target.checked);
			});
			controlCell.appendChild(input);
			row.append(descCell, controlCell);
			tbody.appendChild(row);
		});
	}

	if (category.textFields) {
		category.textFields.forEach((field) => {
			const row = document.createElement("TR");
			const descCell = document.createElement("TD");
			descCell.classList.add("polykit-settings-table__desc");
			descCell.textContent = field.label;
			const controlCell = document.createElement("TD");
			controlCell.classList.add("polykit-settings-table__control");
			const input = document.createElement("INPUT");
			input.type = "text";
			input.id = `polykit_${field.id}`;
			input.name = field.id;
			input.placeholder = field.placeholder;
			input.classList.add("polykit-settings-table__text");
			input.value = polykit_get_text_setting(field.id, "");
			input.addEventListener("change", (event) => {
				localStorage.setItem(`polykit_${field.id}`, event.target.value);
			});
			controlCell.appendChild(input);
			row.append(descCell, controlCell);
			tbody.appendChild(row);
		});
	}

	parent.appendChild(table);
}

/**
 * Append setting label text, rendering <code> and [[[ ]]] markup.
 *
 * @param {HTMLLabelElement} label
 * @param {string} text
 * @returns {void}
 */
function polykit_append_setting_label_content(label, text) {
	const fragment = document.createDocumentFragment();
	const parts = text.split(/(<code>|<\/code>|\[\[\[|\]\]\])/);
	let inCode = false;
	for (const part of parts) {
		if ("<code>" === part || "[[[" === part) {
			inCode = true;
			continue;
		}
		if ("</code>" === part || "]]]" === part) {
			inCode = false;
			continue;
		}
		if (!part) {
			continue;
		}
		if (inCode) {
			fragment.appendChild(document.createElement("CODE")).appendChild(
				document.createTextNode(part),
			);
		} else {
			fragment.appendChild(document.createTextNode(part));
		}
	}
	label.appendChild(fragment);
}

function polykit_get_setting(key) {
	const storageKey = `polykit_${key}`;
	const stored = localStorage.getItem(storageKey);
	if (null !== stored) {
		return "true" === stored;
	}
	const legacy_source_terminology = {
		ja_view_terminology: "ja_source_terminology",
		ja_not_allowed_terminology: "ja_source_terminology",
		ja_sorry_terminology: "ja_source_terminology",
	};
	if (Object.prototype.hasOwnProperty.call(legacy_source_terminology, key)) {
		const legacy = localStorage.getItem(
			`polykit_${legacy_source_terminology[key]}`,
		);
		if (null !== legacy) {
			return "true" === legacy;
		}
	}
	if (Object.prototype.hasOwnProperty.call(polykit_setting_defaults, key)) {
		return polykit_setting_defaults[key];
	}
	return false;
}

/**
 * @param {string} key
 * @param {string} [defaultValue]
 * @returns {string}
 */
function polykit_get_text_setting(key, defaultValue = "") {
	const stored = localStorage.getItem(`polykit_${key}`);
	return null === stored ? defaultValue : stored;
}
