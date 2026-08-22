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
 * 汎用バリデーションのメッセージを収集する（DOM 非依存）。
 *
 * @param {string} originaltext 原文。
 * @param {string} newtext 訳文。
 * @returns {{ warning: string[], notice: string[] }}
 */
function polykit_collect_general_checks(originaltext, newtext) {
	const results = { warning: [], notice: [] };
	if ("undefined" === typeof newtext || "" === newtext) {
		results.warning.push(polykit_t("empty_translation"));
		return results;
	}
	const push = (key, message) => {
		polykit_push_message_by_check_level(results, key, message);
	};
	const lastcharoriginaltext = originaltext.slice(-1);
	const firstcharoriginaltext = originaltext.charAt(0);
	const lastcharnewtext = newtext.slice(-1);
	const firstcharnewtext = newtext.charAt(0);
	const last_dot = [";", ".", "!", ":", "、", "。", "؟", "？", "！", "…"];
	if (polykit_is_check_enabled("no_final_dot")) {
		const has_ascii_ellipsis = -1 !== newtext.indexOf("...");
		if (has_ascii_ellipsis) {
			push("no_final_dot", polykit_t("ascii_ellipsis"));
		}
		if (
			-1 !== originaltext.indexOf("…") &&
			-1 === newtext.indexOf("…") &&
			-1 === newtext.indexOf("&hellip;") &&
			!has_ascii_ellipsis
		) {
			push("no_final_dot", polykit_t("missing_ellipsis"));
		}
	}
	if (polykit_is_check_enabled("no_final_other_dots")) {
		if (
			jQuery.inArray(lastcharoriginaltext, last_dot) >= 0 &&
			-1 === jQuery.inArray(lastcharnewtext, last_dot)
		) {
			push("no_final_other_dots", polykit_t("missing_end_punct"));
		}
	}
	if (polykit_is_check_enabled("no_initial_uppercase")) {
		if (
			polykit_is_uppercase(firstcharoriginaltext) &&
			!polykit_is_uppercase(firstcharnewtext)
		) {
			push(
				"no_initial_uppercase",
				polykit_t("missing_initial_uppercase", firstcharnewtext),
			);
		}
	}
	if (polykit_is_check_enabled("no_initial_space")) {
		if (
			(" " === firstcharoriginaltext && firstcharnewtext !== " ") ||
			(" " === firstcharoriginaltext && firstcharnewtext !== " ")
		) {
			push("no_initial_space", polykit_t("missing_initial_space"));
		}
	}
	if (polykit_is_check_enabled("no_trailing_space")) {
		if (
			(" " === lastcharoriginaltext && lastcharnewtext !== " ") ||
			(" " === lastcharoriginaltext && lastcharnewtext !== " ")
		) {
			push("no_trailing_space", polykit_t("missing_trailing_space"));
		}
	}
	return results;
}

/**
 * @param {string} originaltext 原文。
 * @param {string} newtext 訳文。
 * @returns {string[]}
 */
function polykit_collect_general_warnings(originaltext, newtext) {
	return polykit_collect_general_checks(originaltext, newtext).warning;
}

/**
 * GlotPress 本体の未無視警告メッセージを収集する。
 *
 * @param {string} selector
 * @returns {{ warning: string[], notice: string[] }}
 */
function polykit_collect_gp_warning_messages(selector) {
	const results = { warning: [], notice: [] };
	jQuery(selector).find(
		".warning:not(.polykit-warning):has(> a.discard-warning)",
	).each(function () {
		if (polykit_is_gp_initial_uppercase_warning(this)) {
			polykit_push_message_by_check_level(
				results,
				"no_initial_uppercase",
				this.textContent.trim(),
			);
			return;
		}
		results.warning.push(this.textContent.trim());
	});
	return results;
}

/**
 * 用語集チェックの警告メッセージを収集する。
 *
 * @param {string} selector
 * @param {number} form_index
 * @returns {{ warning: string[], notice: string[] }}
 */
function polykit_collect_glossary_warnings(selector, form_index) {
	const SINGULAR = 0;
	const PLURAL = 1;
	const results = { warning: [], notice: [] };
	if (!polykit_is_check_enabled("no_glossary_term_check")) {
		return results;
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
		return results;
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
				const translation_word_occurrence = polykit_glossary_translation_occurrences(
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
					polykit_push_message_by_check_level(
						results,
						"no_glossary_term_check",
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
	return results;
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
