/* Add Currently Selected Count */
function polykit_selected_count() {
	if (!polykit_user.is_on_translations) return;

	if (jQuery("#polykit-checked-count").length) {
		jQuery("#polykit-checked-count").remove();
	}
	const checked_count = jQuery("tbody .checkbox :checkbox:checked").length;
	if (checked_count > 0) {
		let current_selectedcount = 0;
		let waiting_selectedcount = 0;
		let fuzzy_selectedcount = 0;
		let old_selectedcount = 0;
		let rejected_selectedcount = 0;
		let untranslated_selectedcount = 0;
		let nowarnings_selectedcount = 0;
		let warnings_selectedcount = 0;
		let polykit_selectedcount = 0;
		jQuery("tbody .checkbox :checkbox:checked").each(function (index) {
			const row = jQuery(this).closest("tr.preview");
			if (row.hasClass("status-current")) {
				current_selectedcount++;
			}
			if (row.hasClass("status-waiting")) {
				waiting_selectedcount++;
			}
			if (row.hasClass("status-fuzzy")) {
				fuzzy_selectedcount++;
			}
			if (row.hasClass("status-old")) {
				old_selectedcount++;
			}
			if (row.hasClass("status-rejected")) {
				rejected_selectedcount++;
			}
			if (row.hasClass("untranslated")) {
				untranslated_selectedcount++;
			}
			if (row.hasClass("no-warnings")) {
				nowarnings_selectedcount++;
			}
			if (row.hasClass("has-warnings")) {
				warnings_selectedcount++;
			}
			if (row.hasClass("has-polykit")) {
				polykit_selectedcount++;
			}
		});
		const selected_strings_text = [];
		if (current_selectedcount > 0) {
			selected_strings_text.push(
				polykit_t("selected_current", current_selectedcount),
			);
		}
		if (waiting_selectedcount > 0) {
			selected_strings_text.push(
				polykit_t("selected_waiting", waiting_selectedcount),
			);
		}
		if (fuzzy_selectedcount > 0) {
			selected_strings_text.push(
				polykit_t("selected_fuzzy", fuzzy_selectedcount),
			);
		}
		if (old_selectedcount > 0) {
			selected_strings_text.push(polykit_t("selected_old", old_selectedcount));
		}
		if (rejected_selectedcount > 0) {
			selected_strings_text.push(
				polykit_t("selected_rejected", rejected_selectedcount),
			);
		}
		if (untranslated_selectedcount > 0) {
			selected_strings_text.push(
				polykit_t("selected_untranslated", untranslated_selectedcount),
			);
		}
		if (warnings_selectedcount > 0) {
			selected_strings_text.push(
				polykit_t("selected_warnings", warnings_selectedcount),
			);
		}
		if (polykit_selectedcount > 0) {
			selected_strings_text.push(
				polykit_t("selected_glossary", polykit_selectedcount),
			);
		}
		jQuery("#polykit-notices-container").append(
			`<div id="polykit-checked-count" class="notice">${polykit_t("notice_rows_selected", checked_count)}</div>`,
		);
		if (
			Array.isArray(selected_strings_text) && selected_strings_text.length > 0
		) {
			jQuery("#polykit-checked-count").append(
				` (${selected_strings_text.join("、")}。)`,
			);
		}
	}
}

/* Trigger Currently Selected ReCount on Checkbox Click */
jQuery(document).on("click", ".checkbox :checkbox", (e) => {
	polykit_selected_count();
});

/* Attach to ajaxSuccess to track Approve/Reject/Fuzzy Status Setting */
let approved_count = 0;
let rejected_count = 0;
let fuzzied_count = 0;
let submitted_count = 0;
jQuery(document).ajaxSuccess((event, xhr, settings) => {
	if (
		typeof $gp_editor_options !== "undefined" &&
		settings.url === $gp_editor_options.set_status_url
	) {
		polykit_selected_count();
		const pairs = settings.data.split("&");
		const data = [];
		for (let i = 0; i < pairs.length; i++) {
			const pair = pairs[i].split("=");
			data[pair[0]] = pair[1];
		}
		switch (data["status"]) {
			case "current":
				jQuery("#polykit-approved-count").remove();
				approved_count++;
				jQuery("#polykit-notices-container").append(
					`<div id="polykit-approved-count" class="notice approved">${
						polykit_t("notice_approved", approved_count)
					}</div>`,
				);
				break;
			case "rejected":
				jQuery("#polykit-rejected-count").remove();
				rejected_count++;
				jQuery("#polykit-notices-container").append(
					`<div id="polykit-rejected-count" class="notice rejected">${
						polykit_t("notice_rejected", rejected_count)
					}</div>`,
				);
				break;
			case "fuzzy":
				jQuery("#polykit-fuzzied-count").remove();
				fuzzied_count++;
				jQuery("#polykit-notices-container").append(
					`<div id="polykit-fuzzied-count" class="notice fuzzied">${
						polykit_t("notice_fuzzied", fuzzied_count)
					}</div>`,
				);
				break;
		}
	} else if (settings.url === $gp_editor_options.url) {
		polykit_selected_count();
		jQuery("#polykit-submitted-count").remove();
		submitted_count++;
		jQuery("#polykit-notices-container").append(
			`<div id="polykit-submitted-count" class="notice submitted">${
				polykit_t("notice_submitted", submitted_count)
			}</div>`,
		);
	}
});
