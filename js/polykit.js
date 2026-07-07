"use strict";

const polykit_version = "1.0.1";

// action = 'install', 'update', 'chrome_update', or 'shared_module_update'
const polykit_extension_storage = (null !== localStorage.getItem("polykit_extension_status"))
	? JSON.parse(localStorage.getItem("polykit_extension_status"))
	: "";
const polykit_extension = {
	changelog: ("" !== polykit_extension_storage) ? polykit_extension_storage.changelog : "",
	currentVersion: ("" !== polykit_extension_storage) ? polykit_extension_storage.currentVersion : "0",
	previousVersion: ("" !== polykit_extension_storage) ? polykit_extension_storage.previousVersion : "0",
	reason: ("" !== polykit_extension_storage) ? polykit_extension_storage.reason : "",
};
const polykit_has_been_updated = polykit_extension.currentVersion !== polykit_extension.previousVersion;
const polykit_setting = document.querySelector(".polykit-setting");
if (polykit_setting && polykit_has_been_updated) {
	polykit_setting.click();
	document.querySelector("#polykit-settings-tab2").click();
}

const polykit_glossary = {
	glossary_url: "",
	handbook_url: "",
	guide: {
		title: "",
		url: "",
	},
};

// Create notice container at the beginning since notices are added in AJAX
const translations = document.querySelector("#translations");
const polykit_notices_container = document.createElement("DIV");
polykit_notices_container.id = "polykit-notices-container";
translations && translations.before(polykit_notices_container);

polykit_current_locale_first();

window.polykit_filter_bar = jQuery(polykit_get_filters_toolbar_row());
polykit_get_glossary_global_data();

if (window.polykit_filter_bar.length > 0) {
	polykit_hotkeys();
	// Fix for PTE align
	if (jQuery("#bulk-actions-toolbar-top").length > 0) {
		polykit_add_column();
		if (0 === jQuery("#bulk-actions-toolbar-bottom").length) {
			jQuery("#bulk-actions-toolbar-top").clone().css("float", "none")
				.insertBefore("#legend");
			jQuery("form.filters-toolbar.bulk-actions").submit(function () {
				const row_ids = jQuery(
					"input:checked",
					jQuery("table#translations th.checkbox"),
				).map(function () {
					return jQuery(this).parents("tr.preview").attr("row");
				}).get().join(",");
				jQuery('input[name="bulk[row-ids]"]', jQuery(this)).val(row_ids);
			});
		}
	}
	if (1 === jQuery(".preview").length) {
		jQuery(".preview .action").trigger("click");
	}

	jQuery(
		"<div class='box has-polykit'></div><div>" + polykit_t("legend_glossary") +
			"</div>",
	).appendTo("#legend");
	jQuery(
		"<div class='box has-old-string'></div><div>" + polykit_t("legend_old") +
			"</div>",
	).appendTo("#legend");
	jQuery(
		"<div class='box has-original-copy'></div><div>" +
			polykit_t("legend_original_copy") + "</div>",
	).appendTo("#legend");

	document.querySelectorAll(".glossary-word").forEach(
		polykit_add_glossary_links,
	);

	polykit_mark_old_strings();

	jQuery($gp.editor.table).onFirst(
		"click",
		"button.translation-actions__save:not(.forcesubmit)",
		polykit_validate_visible,
	);
}

polykit_add_project_links();
polykit_add_review_button();
polykit_add_scroll_buttons();
polykit_add_meta();

jQuery(".glossary-word").contextmenu(function (e) {
	const info = jQuery(this).data("translations");
	jQuery(".editor:visible textarea:visible")
		.val(jQuery(".editor:visible textarea:visible").val() + info[0].translation)
		.focus();
	e.preventDefault();
	return false;
});

jQuery(".gp-content").on("click", ".discard-polykit", function (e) {
	const $this = jQuery(this);
	const row = $this.data("row");
	jQuery(`#editor-${row}`).data("discard", "true");
	$this.parent().remove();
	if (0 === jQuery(`#editor-${row} .polykit-warning`).length) {
		jQuery.removeData(`#editor-${row}`, "discard");
	}
	if (0 === jQuery(`#editor-${row} .warning`).length) {
		jQuery(`#editor-${row}`).removeClass("has-warnings").addClass(
			"no-warnings",
		);
		jQuery(`#preview-${row}`).removeClass("has-warnings").addClass(
			"no-warnings",
		);
	}
	e.preventDefault();
	return false;
});

if (polykit_user.is_on_translations) {
	$gp.editor.current &&
		polykit_get_setting("autocopy_string_on_translation_opened") &&
		polykit_copy_visible_original_string();
	$gp.editor.show = function (original) {
		return function () {
			original.apply($gp.editor, arguments);
			polykit_do_consistency(
				$gp.editor.current[0].querySelector(".polykit-consistency"),
			);
			polykit_get_setting("autocopy_string_on_translation_opened") &&
				polykit_copy_visible_original_string();
		};
	}($gp.editor.show);
}

jQuery(".gp-content").on(
	"click",
	".polykit-review:not(.polykit-review-done)",
	function (e) {
		jQuery(this).val(polykit_t("review_in_progress"));
		polykit_run_review();
		jQuery(this).val(polykit_t("review_complete")).removeClass("polykit-review")
			.addClass("polykit-review-done").attr("disabled", "disabled");
	},
);

polykit_selected_count();

polykit_non_breaking_space_highlight();

polykit_curly_apostrophe_highlight();

const polykit_to_top = document.createElement("A");
polykit_to_top.id = "polykit-back-to-top";
polykit_to_top.textContent = "↑";
polykit_to_top.title = polykit_t("back_to_top");
document.body.appendChild(polykit_to_top);

polykit_tag_target_when_source_outside_viewport(
	"#masthead",
	"body",
	"polykit-header-is-hidden",
);

polykit_to_top.addEventListener("click", (e) => {
	e.preventDefault();
	polykit_scroll_to_top();
});

polykit_user.is_connected && polykit_build_sticky_header();

polykit_init_glotpress_l10n();

polykit_wait_table_alter();
polykit_localize_date();
polykit_anonymous();
polykit_pagination();
