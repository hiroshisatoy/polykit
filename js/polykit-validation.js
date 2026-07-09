/**
 * Run the review
 *
 * @returns void
 */
function polykit_run_review() {
	let review_count = 0;
	let review_error_count = 0;
	jQuery("#polykit-review-count").remove();
	jQuery("tr.preview").each(function () {
		const $preview = jQuery(this);
		if ($preview.hasClass("untranslated")) {
			return;
		}
		const preview_id = `#${$preview.attr("id")}`;
		const editor_id = `#editor-${$preview.attr("row")}`;
		polykit_editor_checks_init(editor_id, preview_id);
		const state = polykit_prepare_row_checks(editor_id, true);
		polykit_display_check_results(editor_id, preview_id, state);
		review_count++;
		review_error_count += polykit_count_row_check_issues(state);
	});
	if (review_count) {
		if (review_error_count) {
			jQuery("#polykit-notices-container").append(
				`<div id="polykit-review-count" class="notice reviewed warned">${
					polykit_t("review_warned", review_count, review_error_count)
				}</div>`,
			);
		} else {
			jQuery("#polykit-notices-container").append(
				`<div id="polykit-review-count" class="notice reviewed">${
					polykit_t("review_clean", review_count)
				}</div>`,
			);
		}
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
	const originals = jQuery(".original, .original-text", $editor);
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

/**
 * @param {string} text
 * @returns {string} 正規表現用にエスケープした文字列。
 */
function polykit_escape_regexp(text) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 原文に含まれる用語集の用語のうち、訳文に推奨訳が見つからないものの警告を返す（DOM 非依存）。
 *
 * @param {string} original 原文。
 * @param {string} translated 訳文。
 * @param {{ term: string, translations: string[], source: string }[]} entries 用語集エントリー。
 * @param {string[]} [skip_terms] GlotPress が既にマークしている用語（既存チェックが担当）。
 * @returns {string[]}
 */
function polykit_get_custom_glossary_warnings(
	original,
	translated,
	entries,
	skip_terms = [],
) {
	const warnings = [];
	if (!original || !translated || !entries || !entries.length) {
		return warnings;
	}
	const skip = new Set(skip_terms.map((term) => term.toLowerCase()));
	const translated_lower = translated.toLowerCase();
	for (const entry of entries) {
		if (skip.has(entry.term.toLowerCase())) {
			continue;
		}
		// 単純な複数形 (s / es) も同じ用語として扱う。
		const pattern = new RegExp(
			`(?:^|[^\\p{L}\\p{N}])${polykit_escape_regexp(entry.term)}(?:s|es)?(?![\\p{L}\\p{N}])`,
			"iu",
		);
		if (!pattern.test(original)) {
			continue;
		}
		const found = entry.translations.some((translation) => translated_lower.includes(translation.toLowerCase()));
		if (found) {
			continue;
		}
		if (polykit_check_for_URL(entry.term, translated)) {
			continue;
		}
		warnings.push(polykit_t(
			"glossary_missing_custom",
			"project" === entry.source ? polykit_t("glossary_source_project") : polykit_t("glossary_source_locale"),
			entry.term,
			entry.translations.join("」「"),
		));
	}
	return warnings;
}

/**
 * 取得済みのロケール / プロジェクト用語集で訳文を照合する。
 * GlotPress がツールチップとしてマークした用語は polykit_collect_glossary_warnings が担当するため除外する。
 *
 * @param {string} selector エディターのセレクター。
 * @param {string} original 原文。
 * @param {string} translated 訳文。
 * @returns {string[]}
 */
function polykit_collect_custom_glossary_warnings(selector, original, translated) {
	if (polykit_get_setting("no_glossary_term_check")) {
		return [];
	}
	const marked = jQuery(".glossary-word", jQuery(selector)).map(function () {
		return this.textContent;
	}).get();
	return polykit_get_custom_glossary_warnings(
		original,
		translated,
		polykit_get_custom_glossary_entries(),
		marked,
	);
}
