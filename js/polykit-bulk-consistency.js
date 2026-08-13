"use strict";

const polykit_bulk_safe_limit = 25;

/**
 * @returns {void}
 */
function polykit_bulk_consistency_init() {
	if (!polykit_get_setting("bulk_consistency") || !polykit_user.is_gte) {
		return;
	}
	if (window.location.href.includes("#polykit_magicsaveclose")) {
		polykit_bulk_magic_save();
		return;
	}
	if (window.location.href.includes("#polykit_magicrejectclose")) {
		polykit_bulk_magic_reject();
		return;
	}
	if (
		document.location.href.includes("consistency?search") ||
		document.location.href.includes("consistency/?search")
	) {
		polykit_bulk_consistency_page();
	}
}

/**
 * @returns {void}
 */
function polykit_bulk_magic_save() {
	const warning = polykit_create_element("div", { class: "polykit-bulk-warning" });
	if ("1" !== $gp_editor_options.can_approve) {
		warning.textContent = polykit_t("bulk_no_permission");
		document.querySelector(".translation-wrapper")?.insertAdjacentElement(
			"beforebegin",
			warning,
		);
		setTimeout(() => window.close(), 5000);
		return;
	}
	const stored = localStorage.getItem("polykit_chosen_alternative");
	if (!stored) {
		warning.textContent = polykit_t("bulk_empty_alternative");
		document.querySelector(".translation-wrapper")?.insertAdjacentElement(
			"beforebegin",
			warning,
		);
		return;
	}
	const replacement = polykit_parse_json(stored, null);
	if (!Array.isArray(replacement)) {
		warning.textContent = polykit_t("bulk_empty_alternative");
		document.querySelector(".translation-wrapper")?.insertAdjacentElement(
			"beforebegin",
			warning,
		);
		return;
	}
	const forms = document.querySelectorAll(".translation-wrapper textarea");
	if (forms.length !== replacement.length) {
		warning.textContent = polykit_t("bulk_plural_mismatch");
		document.querySelector(".translation-wrapper")?.insertAdjacentElement(
			"beforebegin",
			warning,
		);
		return;
	}
	let has_empty = false;
	forms.forEach((form, i) => {
		if ("" === replacement[i]) {
			has_empty = true;
			return;
		}
		form.value = replacement[i];
	});
	if (has_empty) {
		warning.textContent = polykit_t("bulk_empty_form");
		document.querySelector(".translation-wrapper")?.insertAdjacentElement(
			"beforebegin",
			warning,
		);
		return;
	}
	polykit_bulk_gp_action("save");
}

/**
 * @returns {void}
 */
function polykit_bulk_magic_reject() {
	if ("1" !== $gp_editor_options.can_approve) {
		window.close();
		return;
	}
	polykit_bulk_gp_action("reject");
}

/**
 * @param {string} action_type
 * @returns {void}
 */
function polykit_bulk_gp_action(action_type) {
	if (!$gp.editor.current) {
		setTimeout(() => polykit_bulk_gp_action(action_type), 1000);
		return;
	}
	if ("save" === action_type) {
		$gp.editor.save(
			$gp.editor.current.find("button.translation-actions__save"),
		);
	} else {
		$gp.editor.set_status($gp.editor.current.find("button.reject"), "rejected");
	}
	setTimeout(() => window.close(), 4000);
}

/**
 * @returns {void}
 */
function polykit_bulk_consistency_page() {
	localStorage.removeItem("polykit_chosen_alternative");
	const alternatives = [];
	document.querySelectorAll(".consistency-table tbody tr").forEach((row) => {
		const forms = [];
		row.querySelectorAll(".translation-text").forEach((el) => {
			forms.push(el.textContent.trim());
		});
		if (!forms.length) {
			const strong = row.querySelector("th strong");
			strong && forms.push(strong.textContent.trim());
		}
		alternatives.push(forms);
	});

	const reject_div = polykit_create_element("div", {
		class: "polykit-bulk-danger",
	}, polykit_t("bulk_danger_zone"));
	reject_div.append(
		polykit_create_element("button", {
			class: "button polykit-fire-magic-reject",
			type: "button",
		}, polykit_t("bulk_reject_all")),
	);
	const replace_btn = polykit_create_element("button", {
		class: "button polykit-fire-magic-save",
		type: "button",
		style: "display:none;",
	}, polykit_t("bulk_replace_save"));

	document.querySelector(".consistency-form")?.insertAdjacentElement(
		"afterend",
		reject_div,
	);
	document.querySelector(".consistency-form")?.insertAdjacentElement(
		"afterend",
		replace_btn,
	);

	document.querySelectorAll(".consistency-table tbody tr").forEach(
		(row, alternative_id) => {
			if (!row.querySelector(".polykit-bulk-buttons")) {
				const buttons = polykit_create_element("div", {
					class: "polykit-bulk-buttons",
				});
				buttons.append(
					polykit_create_element("button", {
						class: "button polykit-choose-alternative",
						type: "button",
						"data-alternative-id": String(alternative_id),
					}, polykit_t("bulk_choose")),
				);
				row.insertAdjacentElement("afterend", buttons);
			}
		},
	);

	document.addEventListener("click", (event) => {
		const choose = event.target.closest(".polykit-choose-alternative");
		if (choose) {
			const alternative_id = parseInt(choose.dataset.alternativeId, 10);
			localStorage.setItem(
				"polykit_chosen_alternative",
				JSON.stringify(alternatives[alternative_id]),
			);
			document.querySelectorAll(".polykit-choose-alternative").forEach((el) => {
				el.classList.remove("chosen");
			});
			choose.classList.add("chosen");
			document.querySelectorAll(
				".polykit-fire-magic-save, .polykit-fire-magic-reject",
			).forEach((el) => {
				el.style.display = "";
			});
			return;
		}
		const save_btn = event.target.closest(".polykit-fire-magic-save");
		if (save_btn) {
			polykit_fire_bulk_save(alternatives);
			return;
		}
		const reject_btn = event.target.closest(".polykit-fire-magic-reject");
		if (reject_btn) {
			polykit_fire_bulk_reject();
		}
	});

	const instructions = polykit_create_element("div", { class: "polykit-bulk-instructions" });
	const ol = document.createElement("ol");
	[
		polykit_t("bulk_instruction_1"),
		polykit_t("bulk_instruction_2"),
		polykit_t("bulk_instruction_3"),
	].forEach((text) => {
		ol.appendChild(polykit_create_element("li", {}, text));
	});
	instructions.append(polykit_t("bulk_instructions_title"), ol);
	document.querySelector("#translations-overview p")?.insertAdjacentElement(
		"afterbegin",
		instructions,
	);
}

/**
 * @returns {void}
 */
function polykit_fire_bulk_reject() {
	const checked = document.querySelectorAll(
		"#translations-overview input[type=checkbox]:checked",
	);
	if (!checked.length) {
		alert(polykit_t("bulk_select_strings"));
		return;
	}
	if (checked.length > polykit_bulk_safe_limit) {
		alert(polykit_t("bulk_limit", polykit_bulk_safe_limit));
		return;
	}
	if (!confirm(polykit_t("bulk_reject_confirm", checked.length))) {
		return;
	}
	checked.forEach((checkbox) => {
		const link = checkbox.closest("tr")?.querySelector("a");
		link && window.open(`${link.href}#polykit_magicrejectclose`, "_blank");
	});
}

/**
 * @param {string[][]} alternatives
 * @returns {void}
 */
function polykit_fire_bulk_save(alternatives) {
	const stored = localStorage.getItem("polykit_chosen_alternative");
	if (!stored) {
		alert(polykit_t("bulk_choose_first"));
		return;
	}
	const chosen = polykit_parse_json(stored, null);
	if (!Array.isArray(chosen)) {
		alert(polykit_t("bulk_choose_first"));
		return;
	}
	const checked = document.querySelectorAll(
		"#translations-overview input[type=checkbox]:checked",
	);
	if (!checked.length) {
		alert(polykit_t("bulk_select_strings"));
		return;
	}
	if (checked.length > polykit_bulk_safe_limit) {
		alert(polykit_t("bulk_limit", polykit_bulk_safe_limit));
		return;
	}
	let chosen_label = chosen[0];
	if (chosen.length > 1) {
		chosen_label = chosen.join("\n");
	}
	if (!confirm(polykit_t("bulk_replace_confirm", checked.length, chosen_label))) {
		return;
	}
	checked.forEach((checkbox) => {
		const link = checkbox.closest("tr")?.querySelector("a");
		link && window.open(`${link.href}#polykit_magicsaveclose`, "_blank");
	});
	const save_btn = document.querySelector(".polykit-fire-magic-save");
	if (save_btn) {
		save_btn.textContent = polykit_t("bulk_reload");
		save_btn.replaceWith(save_btn.cloneNode(true));
		document.querySelector(".polykit-fire-magic-save")?.addEventListener(
			"click",
			() => location.reload(),
		);
	}
}
