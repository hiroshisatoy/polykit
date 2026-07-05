function polykit_add_meta() {
  jQuery("#translations tr.editor").each(function () {
    polykit_add_string_counts(this);
  });
}

function polykit_add_string_counts(row) {
  if (jQuery(".meta .polykit-counts", row).length) {
    jQuery(".meta .polykit-counts", row).remove();
  }
  if (jQuery(".original", row).length) {
    jQuery(".meta dl:last-of-type", row).before(
      '<div class="polykit-counts" style="margin-top: 20px;"></div>',
    );

    if (jQuery(".original", row).length > 1) {
      // Plurals
      jQuery(".original", row).each(function () {
        const parts = jQuery(this).parent().text().split(":");
        const type = parts[0];
        polykit_add_count(
          row,
          jQuery(this),
          "original-count",
          `${type} ${polykit_t("meta_original")}`,
        );
      });
      if (jQuery(".textareas", row).length > 2) {
        // Multi-Plural
        jQuery(".textareas", row).each(function (index) {
          polykit_add_plural_definition(row, index, "plural-heading");
          if (jQuery(this).find(".translation").text().trim().length) {
            polykit_add_count(
              row,
              jQuery(this).find(".translation"),
              `translated-count-${index}`,
              polykit_t("meta_translated"),
            );
          }

          polykit_add_count(
            row,
            jQuery(this).find("textarea.foreign-text"),
            `current-count-${index}`,
            polykit_t("meta_current"),
          );

          jQuery(this).on(
            "change keyup paste focus",
            "textarea.foreign-text",
            function () {
              polykit_update_count(
                row,
                jQuery(this),
                `current-count-${index}`,
                true,
              );
            },
          );
        });
      } else {
        // Singular + Plural
        jQuery(".textareas", row).each(function (index) {
          let prefix = `${polykit_t("meta_singular")} `;
          if (index > 0) prefix = `${polykit_t("meta_plural")} `;
          if (jQuery(this).find(".translation").text().trim().length) {
            polykit_add_count(
              row,
              jQuery(this).find(".translation"),
              `translated-count-${index}`,
              `${prefix}${polykit_t("meta_translated")}`,
            );
          }

          polykit_add_count(
            row,
            jQuery(this).find("textarea.foreign-text"),
            `current-count-${index}`,
            `${prefix}${polykit_t("meta_current")}`,
          );

          jQuery(this).on(
            "change keyup paste focus",
            "textarea.foreign-text",
            function () {
              polykit_update_count(
                row,
                jQuery(this),
                `current-count-${index}`,
                true,
              );
            },
          );
        });
      }
    } else {
      // Singular
      polykit_add_count(
        row,
        jQuery(".original", row),
        "original-count",
        polykit_t("meta_original"),
      );
      if (jQuery(".translation", row).text().trim().length) {
        polykit_add_count(
          row,
          jQuery(".translation", row),
          "translated-count",
          polykit_t("meta_translated"),
        );
      }

      polykit_add_count(
        row,
        jQuery(".textareas textarea.foreign-text", row),
        "current-count",
        polykit_t("meta_current"),
      );

      jQuery(row).on(
        "change keyup paste focus",
        ".textareas textarea.foreign-text",
        function () {
          polykit_update_count(row, jQuery(this), "current-count", true);
        },
      );
    }
  }
}

function polykit_add_count(row, element, countclass, label, textarea = false) {
  let string = "";
  if (textarea) {
    string = element.val();
  } else {
    string = element.text();
  }
  const characterCount = string.length;
  let wordCount = 0;
  if (characterCount > 0) {
    if (string.indexOf(" ") !== -1) {
      const words = string.split(" ");
      wordCount = words.length;
    } else {
      wordCount = 1;
    }
  }
  jQuery(".polykit-counts", row).append(
    `<dl class="${countclass}"><dt>${label}:</dt><dd><span class="characters">${characterCount} ${
      polykit_t("characters")
    }</span> (<span class="words">${wordCount} ${
      polykit_t("words_ref")
    }</span>)</dl>`,
  );
}

function polykit_update_count(row, element, countclass, textarea = false) {
  let string = "";
  if (textarea) {
    string = element.val();
  } else {
    string = element.text();
  }
  const characterCount = string.length;
  let wordCount = 0;
  if (characterCount > 0) {
    if (string.indexOf(" ") !== -1) {
      const words = string.split(" ");
      wordCount = words.length;
    } else {
      wordCount = 1;
    }
  }
  jQuery(`.polykit-counts .${countclass} dd .characters`, row).text(
    `${characterCount} ${polykit_t("characters")}`,
  );
  jQuery(`.polykit-counts .${countclass} dd .words`, row).text(
    `${wordCount} ${polykit_t("words_ref")}`,
  );
}

function polykit_add_plural_definition(row, index, pluralclass) {
  const definition = jQuery(
    `.translation-form-list button[data-plural-index="${index}"]`,
    row,
  ).attr("aria-label");
  jQuery(".polykit-counts", row).append(
    `<dl class="${pluralclass}" style="margin-top: 20px;"><dt>${
      polykit_t("meta_plural_label")
    }</dt><dd>${definition}</dl>`,
  );
}

function polykit_localize_date(current_editor = ".editor") {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  const localized_date = polykit_create_element("span", {
    "class": "localized_date",
  });
  document.querySelectorAll(`${current_editor} .editor-panel__right .meta dd`)
    .forEach((dd) => {
      if (19 === dd.textContent.indexOf(" UTC")) {
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
        this_localized_date.prepend(
          `${
            new_date.toLocaleDateString(locale, {
              timeZone: tz,
              year: "numeric",
              month: "numeric",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZoneName: "short",
            })
          }`,
        );
        dd.insertAdjacentElement("afterend", this_localized_date);
        dd.style.display = "none";
      }
    });
}
