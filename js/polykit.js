"use strict";

// action = 'install', 'update', 'chrome_update', or 'shared_module_update'
const polykit_extension_storage = polykit_parse_json(
	localStorage.getItem("polykit_extension_status"),
	{},
);
const polykit_extension = {
	changelog: polykit_extension_storage.changelog || "",
	currentVersion: polykit_extension_storage.currentVersion || "0",
	previousVersion: polykit_extension_storage.previousVersion || "0",
	reason: polykit_extension_storage.reason || "",
};
const polykit_has_been_updated = polykit_extension.currentVersion !==
	polykit_extension.previousVersion;
const polykit_setting = document.querySelector(".polykit-setting");
if (polykit_setting && polykit_has_been_updated) {
	polykit_setting.click();
	document.querySelector("#polykit-settings-tab-welcome")?.click();
}

const polykit_glossary = {
	glossary_url: "",
	handbook_url: "",
	guide: {
		title: "",
		url: "",
	},
};

/**
 * @returns {void}
 */
function polykit_bind_glossary_contextmenu() {
	jQuery(document).on("contextmenu", ".glossary-word", function (e) {
		const translation = polykit_glossary_translation_from_data(
			jQuery(this).data("translations"),
		);
		const textarea = jQuery(".editor:visible textarea:visible");
		if (!translation || !textarea.length) {
			return;
		}
		textarea.val(textarea.val() + translation).focus();
		e.preventDefault();
		return false;
	});
}

/**
 * @returns {void}
 */
function polykit_init_back_to_top() {
	if (document.getElementById("polykit-back-to-top")) {
		return;
	}
	const polykit_to_top = document.createElement("a");
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
}

/**
 * @returns {void}
 */
function polykit_init_translation_table() {
	polykit_ensure_notices_container();

	window.polykit_filter_bar = jQuery(polykit_get_filters_toolbar_row());

	if (window.polykit_filter_bar.length > 0) {
		polykit_hotkeys();
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

		document.querySelectorAll(".glossary-word").forEach(
			polykit_add_glossary_links,
		);
	}

	polykit_add_review_button();
	polykit_add_meta();
	polykit_bind_glossary_contextmenu();

	if (polykit_user.is_on_translations && typeof $gp !== "undefined" && $gp.editor) {
		polykit_start_alternating_plugin_title();
		$gp.editor.current &&
			polykit_get_setting("autocopy_string_on_translation_opened") &&
			polykit_copy_visible_original_string();
		if ($gp.editor.show) {
			$gp.editor.show = function (original) {
				return function () {
					original.apply($gp.editor, arguments);
					const current = $gp.editor.current && $gp.editor.current[0];
					if (current) {
						polykit_do_consistency(
							current.querySelector(".polykit-consistency"),
						);
						polykit_get_setting("autocopy_string_on_translation_opened") &&
							polykit_copy_visible_original_string();
					}
				};
			}($gp.editor.show);
		}
	}

	jQuery(".gp-content").on(
		"click",
		".polykit-review:not(.polykit-review-done)",
		function () {
			jQuery(this).val(polykit_t("review_in_progress"));
			polykit_run_review();
		},
	);

	polykit_selected_count();
	polykit_non_breaking_space_highlight();
	polykit_user.is_connected && polykit_build_sticky_header();
	polykit_wait_table_alter();
	polykit_localize_date();
	polykit_anonymous();
	polykit_pagination();
	polykit_checks_init();
	polykit_wrap_review_paging_row();
	polykit_search_events();
}

/**
 * @returns {void}
 */
function polykit_init() {
	const has_translations = Boolean(document.querySelector("#translations"));

	polykit_current_locale_first();

	if (has_translations || document.querySelector(".polykit-setting")) {
		polykit_get_glossary_global_data();
	}

	polykit_add_project_links();
	polykit_add_scroll_buttons();
	polykit_init_back_to_top();
	polykit_init_glotpress_l10n();
	polykit_bulk_consistency_init();

	if (has_translations) {
		polykit_init_translation_table();
	} else {
		window.polykit_filter_bar = jQuery();
		polykit_search_page_notice();
	}
}

polykit_init();
