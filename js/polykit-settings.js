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
    polykit_settings.style.display = ("none" === polykit_settings.style.display)
      ? ""
      : "none";
    return;
  }

  // Use [[[ code ]]] markdown for symbols and add * at the end of the setting's description if needed.
  const settings_data = [
    {
      "title": polykit_t("hide_warnings_title"),
      "settings": {
        "no_glossary_term_check": polykit_t("setting_no_glossary_term_check"),
        "no_initial_uppercase": polykit_t("setting_no_initial_uppercase"),
        "no_initial_space": polykit_t("setting_no_initial_space"),
        "no_trailing_space": polykit_t("setting_no_trailing_space"),
        "no_final_dot": polykit_t("setting_no_final_dot"),
        "no_final_other_dots": polykit_t("setting_no_final_other_dots"),
      },
    },
    {
      "title": polykit_t("show_warnings_title"),
      "settings": {
        "curly_apostrophe_warning": polykit_t(
          "setting_curly_apostrophe_warning",
        ),
        "localized_quote_warning": polykit_t("setting_localized_quote_warning"),
      },
    },
    {
      "title": polykit_t("ja_style_width_title"),
      "settings": {
        "ja_fullwidth_ascii": polykit_t("setting_ja_fullwidth_ascii"),
        "ja_fullwidth_number": polykit_t("setting_ja_fullwidth_number"),
        "ja_space_before_half": polykit_t("setting_ja_space_before_half"),
        "ja_space_around_mixed": polykit_t("setting_ja_space_around_mixed"),
        "ja_space_after_comma": polykit_t("setting_ja_space_after_comma"),
        "ja_colon_spacing": polykit_t("setting_ja_colon_spacing"),
        "ja_digit_spacing": polykit_t("setting_ja_digit_spacing"),
      },
    },
    {
      "title": polykit_t("ja_style_paren_title"),
      "settings": {
        "ja_paren_space_outside": polykit_t("setting_ja_paren_space_outside"),
        "ja_paren_space_inside": polykit_t("setting_ja_paren_space_inside"),
      },
    },
    {
      "title": polykit_t("ja_style_terminology_title"),
      "settings": {
        "ja_terminology": polykit_t("setting_ja_terminology"),
        "ja_source_terminology": polykit_t("setting_ja_source_terminology"),
      },
    },
    {
      "title": polykit_t("ja_style_quotes_title"),
      "settings": {
        "ja_straight_quotes": polykit_t("setting_ja_straight_quotes"),
      },
    },
    {
      "title": polykit_t("others_title"),
      "settings": {
        "no_non_breaking_space": polykit_t("setting_no_non_breaking_space"),
        "autocopy_string_on_translation_opened": polykit_t("setting_autocopy"),
        "autosubmit_bulk_copy_from_original": polykit_t(
          "setting_autosubmit_bulk",
        ),
        "force_autosubmit_bulk_copy_from_original": polykit_t(
          "setting_force_autosubmit_bulk",
        ),
      },
    },
  ];

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
    [polykit_t("hk_next")]: "Page Down",
    [polykit_t("hk_prev")]: "Page Up",
    [polykit_t("hk_reject")]: "Ctrl+Shift+R",
    [polykit_t("hk_save")]: "Ctrl+Enter",
  };

  const container = document.createElement("DIV");
  container.classList.add("polykit-settings");

  const input1 = document.createElement("INPUT");
  input1.classList.add("polykit-settings__radio");
  input1.type = "radio";
  input1.name = "group";

  const input2 = input1.cloneNode(true);
  const input3 = input1.cloneNode(true);
  input1.id = "polykit-settings__radio1";
  input1.checked = "checked";
  input2.id = "polykit-settings__radio2";
  input3.id = "polykit-settings__radio3";

  container.append(input1, input2, input3);

  const tabs = document.createElement("DIV");
  tabs.classList.add("polykit-settings-tabs");
  const tab1 = document.createElement("LABEL");
  tab1.classList.add("polykit-settings-tab");
  const tab2 = tab1.cloneNode(true);
  const tab3 = tab1.cloneNode(true);
  tab1.id = "polykit-settings-tab1";
  tab1.htmlFor = "polykit-settings__radio1";
  tab1.textContent = polykit_t("settings_tab");
  tab2.id = "polykit-settings-tab2";
  tab2.htmlFor = "polykit-settings__radio2";
  tab2.textContent = "install" === polykit_extension.reason
    ? polykit_t("welcome_tab_install")
    : polykit_t("welcome_tab_update");
  tab3.id = "polykit-settings-tab3";
  tab3.htmlFor = "polykit-settings__radio3";
  tab3.textContent = polykit_t("gte_tools_tab");
  container.appendChild(tabs).append(tab1, tab2, tab3);

  const panels = document.createElement("DIV");
  panels.classList.add("polykit-settings-panels");
  const panel1 = document.createElement("DIV");
  panel1.classList.add("polykit-settings-panel");
  const panel2 = panel1.cloneNode(true);
  const panel3 = panel1.cloneNode(true);
  panel1.id = "polykit-settings-panel1";
  panel2.id = "polykit-settings-panel2";
  panel3.id = "polykit-settings-panel3";
  panels.append(panel1, panel2, panel3);
  container.appendChild(panels);

  const settingsFragment = document.createDocumentFragment();
  const asterisk = document.createElement("SPAN");
  asterisk.classList.add("polykit-asterisk");
  asterisk.textContent = "*";
  settings_data.forEach((category) => {
    settingsFragment.appendChild(document.createElement("H3")).appendChild(
      document.createTextNode(category.title),
    );
    Object.entries(category.settings).forEach((setting) => {
      const setting_slug = setting[0];
      let setting_desc = setting[1];
      const input = document.createElement("INPUT");
      const label = document.createElement("LABEL");
      input.type = "checkbox";
      input.id = `polykit_${setting_slug}`;
      input.checked = polykit_get_setting(setting_slug);

      input.addEventListener("click", (event) => {
        localStorage.setItem("polykit_" + setting_slug, event.target.checked);
      });

      label.appendChild(input);
      let has_asterisk = false;
      if ("*" === setting_desc.slice(-1)) {
        has_asterisk = true;
        setting_desc = setting_desc.slice(0, -1);
      }
      polykit_append_setting_label_content(label, setting_desc);
      if (has_asterisk) {
        label.appendChild(asterisk.cloneNode(true));
      }
      settingsFragment.appendChild(label);
    });
  });
  const fieldset = document.createElement("FIELDSET");
  fieldset.appendChild(settingsFragment);
  panel1.appendChild(fieldset);

  const hotkeysFragment = document.createDocumentFragment();
  const headerRow = document.createElement("TR");
  headerRow.appendChild(document.createElement("TH")).appendChild(
    document.createTextNode(polykit_t("hotkey_action")),
  );
  headerRow.appendChild(document.createElement("TH")).appendChild(
    document.createTextNode(polykit_t("hotkey_key")),
  );
  hotkeysFragment.appendChild(headerRow);
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
  const table = document.createElement("TABLE");
  table.appendChild(hotkeysFragment);
  panel1.appendChild(table);
  const caution_note = document.createElement("SPAN");
  caution_note.style.fontWeight = "bold";
  caution_note.style.margin = "1em 0 .2em";
  caution_note.append(asterisk, polykit_t("caution_note"));
  panel1.appendChild(caution_note);

  const changelog = document.createElement("DIV");
  changelog.classList.add("polykit-changelog");
  const closeSettings = document.createElement("A");
  closeSettings.classList.add("polykit-close-settings");
  closeSettings.textContent = polykit_t("close");
  closeSettings.addEventListener("click", () => {
    polykit_settings_menu.click();
  });
  const currentVersion = "0" === polykit_extension.currentVersion
    ? ""
    : polykit_extension.currentVersion;
  const panel2Title = "install" === polykit_extension.reason
    ? polykit_t("welcome_install_title", currentVersion)
    : polykit_t("welcome_update_title", currentVersion);
  changelog.appendChild(document.createElement("H3")).appendChild(
    document.createTextNode(panel2Title),
  );
  if ("install" === polykit_extension.reason) {
    changelog.appendChild(document.createElement("P")).appendChild(
      document.createTextNode(polykit_t("welcome_install_intro")),
    );
    const ul = document.createElement("UL");
    const advices = {
      1: polykit_t("welcome_advice_1"),
      2: polykit_t("welcome_advice_2"),
      3: polykit_t("welcome_advice_3"),
    };
    Object.values(advices).forEach((advice) => {
      ul.appendChild(document.createElement("LI")).appendChild(
        document.createTextNode(advice),
      );
    });
    changelog.appendChild(ul);
    changelog.appendChild(document.createElement("P")).appendChild(
      document.createTextNode(polykit_t("welcome_enjoy")),
    );
  } else {
    const link = document.createElement("A");
    link.href =
      "https://github.com/hiroshisatoy/polykit/blob/main/CHANGELOG.md";
    link.textContent = polykit_t("check_changelog");
    changelog.appendChild(document.createElement("DIV")).appendChild(
      document.createTextNode(polykit_extension.changelog),
    );
    changelog.appendChild(link);
  }
  panel2.append(closeSettings, changelog);

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
  panel1.insertBefore(quickLinks, panel1.firstChild);

  polykit_user.is_connected && polykit_user.is_gte &&
    polykit_set_panel3_settings(panel3);

  document.querySelector(".gp-content").prepend(container);
}

const polykit_setting_defaults = {
  no_initial_uppercase: true,
  no_final_dot: true,
  curly_apostrophe_warning: false,
  localized_quote_warning: false,
  ja_fullwidth_ascii: true,
  ja_fullwidth_number: true,
  ja_space_before_half: true,
  ja_space_around_mixed: true,
  ja_space_after_comma: true,
  ja_colon_spacing: true,
  ja_digit_spacing: true,
  ja_paren_space_outside: true,
  ja_paren_space_inside: true,
  ja_terminology: true,
  ja_source_terminology: true,
  ja_straight_quotes: true,
};

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
  if (null === stored) {
    return Object.prototype.hasOwnProperty.call(polykit_setting_defaults, key)
      ? polykit_setting_defaults[key]
      : false;
  }
  return "true" === stored;
}

/**
 * Add GTE Tools panel3 to settings
 *
 * @returns void
 * @param panel3 Target div element for 3rd panel
 */
function polykit_set_panel3_settings(panel3) {
  const fragment3 = document.createDocumentFragment();
  fragment3.appendChild(document.createElement("H3")).appendChild(
    document.createTextNode(polykit_t("gte_locale_settings")),
  );
  fragment3.appendChild(document.createElement("DIV")).appendChild(
    document.createTextNode(polykit_t("gte_glossary_recommend")),
  );
  const styleGuide = document.createElement("DIV");
  fragment3.appendChild(styleGuide);
  styleGuide.classList.add("polykit-settings-tab3__style-guide");
  styleGuide.appendChild(document.createElement("H4")).appendChild(
    document.createTextNode(polykit_t("gte_style_guide_customize")),
  );
  styleGuide.appendChild(document.createElement("DIV")).appendChild(
    document.createTextNode(polykit_t("gte_style_guide_default_desc")),
  );
  styleGuide.appendChild(document.createElement("P")).appendChild(
    document.createTextNode(polykit_t("gte_style_guide_form_desc")),
  );
  const styleGuideForm = document.createDocumentFragment();

  const styleGuideURLLabel = document.createElement("LABEL");
  styleGuideURLLabel.htmlFor = "polykit-styleguide-url";
  styleGuideURLLabel.classList.add("polykit-settings-label");
  styleGuideURLLabel.textContent = polykit_t("gte_style_guide_url_label");

  const styleGuideURLInput = document.createElement("INPUT");
  styleGuideURLInput.type = "text";
  styleGuideURLInput.size = 100;
  styleGuideURLInput.name = "polykit-styleguide-url";
  styleGuideURLInput.id = "polykit-styleguide-url";
  styleGuideURLInput.placeholder = "https://en-gb.wordpress.org/translations/";
  styleGuideURLInput.setAttribute("style", "width: 98%!important");

  const styleGuideMenuLabel = document.createElement("LABEL");
  styleGuideMenuLabel.htmlFor = "polykit-styleguide-menu";
  styleGuideMenuLabel.classList.add("polykit-settings-label");
  styleGuideMenuLabel.textContent = polykit_t("gte_style_guide_title_label");

  const styleGuideMenuInput = document.createElement("INPUT");
  styleGuideMenuInput.type = "text";
  styleGuideMenuInput.size = 30;
  styleGuideMenuInput.name = "polykit-styleguide-menu";
  styleGuideMenuInput.id = "polykit-styleguide-menu";
  styleGuideMenuInput.placeholder = polykit_t(
    "gte_style_guide_title_placeholder",
  );

  const styleGuideGeneratorButton = document.createElement("BUTTON");
  styleGuideGeneratorButton.id = "polykit-styleguide-btn";
  styleGuideGeneratorButton.type = "button";
  styleGuideGeneratorButton.style.margin = "10px 0";
  styleGuideGeneratorButton.textContent = polykit_t("generate_html");

  const styleGuideHTMLCode = document.createElement("TEXTAREA");
  styleGuideHTMLCode.id = "polykit-styleguide-html";
  styleGuideHTMLCode.placeholder = polykit_t(
    "gte_style_guide_html_placeholder",
  );
  styleGuideHTMLCode.rows = 5;
  styleGuideHTMLCode.setAttribute("style", "width: 98%!important");

  styleGuideForm.append(
    styleGuideMenuLabel,
    styleGuideMenuInput,
    styleGuideURLLabel,
    styleGuideURLInput,
    styleGuideGeneratorButton,
    styleGuideHTMLCode,
  );
  fragment3.appendChild(styleGuideForm);
  panel3.appendChild(fragment3);

  styleGuideGeneratorButton.addEventListener("click", () => {
    styleGuideURLInput.style.border = "" === styleGuideURLInput.value
      ? "red 1px solid"
      : "green 1px solid";
    styleGuideMenuInput.style.border = "" === styleGuideMenuInput.value
      ? "red 1px solid"
      : "green 1px solid";
    if ("" === styleGuideURLInput.value || "" === styleGuideMenuInput.value) {
      return;
    }
    styleGuideHTMLCode.value =
      `<a href="${styleGuideURLInput.value}" id="polykit-guide-link" data-title="${styleGuideMenuInput.value}">${styleGuideMenuInput.value}</a>`;
  });
}
