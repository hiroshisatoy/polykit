/**
 * Run the review
 *
 * @returns void
 */
function polykit_run_review() {
	polykit_check_all_translations(true);
	polykit_ensure_review_summary();
}

/**
 * レビュー完了状態にし、ボタン表示を更新する。
 *
 * @returns {void}
 */
function polykit_ensure_review_summary() {
	const button = document.querySelector(".polykit-review, .polykit-review-done");
	if (button) {
		button.classList.remove("polykit-review");
		button.classList.add("polykit-review-done");
		button.disabled = true;
	}
	polykit_update_review_summary();
}

/**
 * レビュー完了ボタンの表示を、警告 / 通知の件数に合わせて更新する。
 *
 * @returns {void}
 */
function polykit_update_review_summary() {
	const button = document.querySelector(".polykit-review-done, .polykit-review");
	if (!button || !button.classList.contains("polykit-review-done")) {
		return;
	}
	const warning_count = document.querySelectorAll(".polykit-has-check-warning").length;
	const notice_count = document.querySelectorAll(".polykit-has-check-notice").length;
	button.classList.toggle("polykit-review-has-issues", warning_count > 0);
	if (warning_count || notice_count) {
		button.value = polykit_t("review_complete_issues", warning_count, notice_count);
	} else {
		button.value = polykit_t("review_complete");
	}
}

/**
 * 汎用バリデーションの警告メッセージを収集する（DOM 非依存）。
 *
 * @param {string} originaltext 原文。
 * @param {string} newtext 訳文。
 * @returns {string[]}
 */
function polykit_collect_general_warnings(originaltext, newtext) {
	const warnings = [];
	if ("undefined" === typeof newtext || "" === newtext) {
		warnings.push(polykit_t("empty_translation"));
		return warnings;
	}
	const lastcharoriginaltext = originaltext.slice(-1);
	const firstcharoriginaltext = originaltext.charAt(0);
	const hellipseoriginaltext = "..." === originaltext.slice(-3);
	const lastcharnewtext = newtext.slice(-1);
	const firstcharnewtext = newtext.charAt(0);
	const last_dot = [";", ".", "!", ":", "、", "。", "؟", "？", "！"];
	if (hellipseoriginaltext) {
		if (!polykit_get_setting("no_final_dot")) {
			if (
				"..." === newtext.slice(-3) ||
				(lastcharnewtext !== ";" && lastcharnewtext !== "." &&
					lastcharnewtext !== "…")
			) {
				warnings.push(polykit_t("missing_ellipsis"));
			}
		}
	} else if (!polykit_get_setting("no_final_other_dots")) {
		if (
			jQuery.inArray(lastcharoriginaltext, last_dot) >= 0 &&
			-1 === jQuery.inArray(lastcharnewtext, last_dot)
		) {
			warnings.push(polykit_t("missing_end_punct"));
		}
	}
	if (!polykit_get_setting("no_initial_uppercase")) {
		if (
			polykit_is_uppercase(firstcharoriginaltext) &&
			!polykit_is_uppercase(firstcharnewtext)
		) {
			warnings.push(
				polykit_t("missing_initial_uppercase", firstcharnewtext),
			);
		}
	}
	if (!polykit_get_setting("no_initial_space")) {
		if (
			(" " === firstcharoriginaltext && firstcharnewtext !== " ") ||
			(" " === firstcharoriginaltext && firstcharnewtext !== " ")
		) {
			warnings.push(polykit_t("missing_initial_space"));
		}
	}
	if (!polykit_get_setting("no_trailing_space")) {
		if (
			(" " === lastcharoriginaltext && lastcharnewtext !== " ") ||
			(" " === lastcharoriginaltext && lastcharnewtext !== " ")
		) {
			warnings.push(polykit_t("missing_trailing_space"));
		}
	}
	if (polykit_get_setting("curly_apostrophe_warning")) {
		if (newtext.indexOf("'") > -1) {
			warnings.push(polykit_t("curly_apostrophe_warning_msg"));
		}
	}
	if (polykit_get_setting("localized_quote_warning")) {
		let check_quotes = newtext;
		check_quotes = check_quotes.replace(
			/([^>"]*)"(?=[^<]*>)/g,
			"$1#POLYKITATTR#",
		);
		if (check_quotes.indexOf('"') > -1) {
			warnings.push(polykit_t("localized_quote_warning_msg"));
		}
	}
	return warnings;
}

/**
 * GlotPress 本体の未無視警告メッセージを収集する。
 *
 * @param {string} selector
 * @returns {string[]}
 */
function polykit_collect_gp_warning_messages(selector) {
	const messages = [];
	jQuery(selector).find(
		".warning:not(.polykit-warning):has(> a.discard-warning)",
	).each(function () {
		if (
			polykit_get_setting("no_initial_uppercase") &&
			polykit_is_gp_initial_uppercase_warning(this)
		) {
			return;
		}
		messages.push(this.textContent.trim());
	});
	return messages;
}

/**
 * 用語集チェックの警告メッセージを収集する。
 *
 * @param {string} selector
 * @param {number} form_index
 * @returns {string[]}
 */
function polykit_collect_glossary_warnings(selector, form_index) {
	const SINGULAR = 0;
	const PLURAL = 1;
	const warnings = [];
	if (polykit_get_setting("no_glossary_term_check")) {
		return warnings;
	}
	const $editor = jQuery(selector);
	const translations = jQuery("textarea.foreign-text", $editor);
	// 用語集登録語は GlotPress が .original-text 内に .glossary-word としてマークする
	// （ロケール用語集とプロジェクト用語集のマージ済み）。旧マークアップは .original のみ。
	let originals = jQuery(".original-text", $editor);
	if (!originals.length) {
		originals = jQuery(".original", $editor);
	}
	let original_index = SINGULAR;
	if (2 === originals.length && 1 === translations.length) {
		original_index = PLURAL;
	}
	if (form_index > 0) {
		original_index = PLURAL;
	}
	const translation = translations.get(form_index);
	if (!translation) {
		return warnings;
	}
	const translatedText = translation.value;
	const glossary_words = jQuery(".glossary-word", originals[original_index])
		.map(function () {
			return this.textContent;
		}).get();
	const words_with_warning = [];
	jQuery(".glossary-word", originals[original_index]).each(
		(j, glossary_element) => {
			const glossary_word = glossary_element.textContent.toLowerCase();
			if (words_with_warning.includes(glossary_word)) {
				return true;
			}
			const glossary_word_occurrence =
				glossary_words.filter((word) => word.toLowerCase() === glossary_word).length;
			const glossary_word_translations = jQuery(glossary_element).data(
				"translations",
			);
			let reset = "";
			let count = "";
			const term = jQuery(glossary_element).html();
			jQuery(glossary_word_translations).each((index) => {
				if ("N/A" === glossary_word_translations[index].translation) {
					return true;
				}
				const translation_word_occurrence = polykit_occurrences(
					translation.value,
					glossary_word_translations[index].translation,
				);
				if (translation_word_occurrence < glossary_word_occurrence) {
					words_with_warning.push(glossary_word);
					reset = `${reset}“<b>${glossary_word_translations[index].translation}</b>“, `;
					const diff = glossary_word_occurrence - translation_word_occurrence;
					count = polykit_t("glossary_count", diff);
				} else {
					reset = "";
					return false;
				}
			});
			if (reset !== "") {
				reset = reset.slice(0, -2);
				let message = polykit_t("missing_glossary");
				if (glossary_word_translations.length > 1) {
					message = polykit_t("missing_glossary_any");
				}
				const form = translations.length > 1
					? (original_index === SINGULAR
						? polykit_t("glossary_form_singular")
						: polykit_t("glossary_form_plural"))
					: "";
				const is_within_URL = polykit_check_for_URL(
					glossary_word,
					translatedText,
				);
				if (!is_within_URL) {
					warnings.push(
						polykit_t(
							"missing_glossary_detail",
							message,
							reset,
							term,
							count,
							form,
						),
					);
				}
			}
		},
	);
	return warnings;
}

/**
 * GlotPress 本体の「先頭大文字」警告かどうか。
 *
 * @param {Element} element
 * @returns {boolean}
 */
function polykit_is_gp_initial_uppercase_warning(element) {
	return /missing the initial uppercase/i.test(element.textContent);
}
