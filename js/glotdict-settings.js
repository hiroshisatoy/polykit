const gd_user = {
	is_translator:      false,
	is_editor:          false,
	is_connected:       false,
	is_on_translations: false,
	is_gte:             false,
};

if ( ( 'undefined' !== typeof $gp_editor_options ) && '' === $gp_editor_options.can_approve ) {
	document.body.classList.add( 'gd-user-is-translator', 'gd-on-translations' );
	gd_user.is_translator = true;
	gd_user.is_on_translations = true;
}
if ( ( 'undefined' !== typeof $gp_editor_options ) && '1' === $gp_editor_options.can_approve ) {
	document.body.classList.add( 'gd-user-is-editor', 'gd-on-translations' );
	gd_user.is_editor = true;
	gd_user.is_on_translations = true;
}
gd_user.is_connected = document.querySelector( 'body.logged-in' ) !== null;

document.querySelector( '#menu-headline-nav' ).insertAdjacentHTML( 'beforeend', '<li class="gd_setting" style="cursor:pointer;"><a> PolyKit</a></li>' );
document.querySelector( '.gd_setting' ).prepend( document.querySelector( '.gd_icon' ) );
document.querySelector( '.gd_icon' ).style.display = '';

const gd_settings_menu = document.querySelector( '.gd_setting' );
gd_settings_menu && gd_settings_menu.addEventListener( 'click', () => {
	if ( document.body.classList.contains( 'gd-settings-on-screen' ) && '0' !== gd_extension.previousVersion ) {
		gd_extension.previousVersion = gd_extension.currentVersion;
		localStorage.setItem( 'polykit_extension_status', JSON.stringify( gd_extension ) );
	}
	document.body.classList.toggle( 'gd-settings-on-screen' );
	gd_generate_settings_panel();
} );

function gd_generate_settings_panel() {
	const gd_settings = document.querySelector( '.gd_settings' );
	if ( null !== gd_settings ) {
		gd_settings.style.display = ( 'none' === gd_settings.style.display ) ? '' : 'none';
		return;
	}

	// Use [[[ code ]]] markdown for symbols and add * at the end of the setting's description if needed.
	const settings_data = [
		{
			'title':    gd_ja_t( 'hide_warnings_title' ),
			'settings': {
				'no_glossary_term_check': gd_ja_t( 'setting_no_glossary_term_check' ),
				'no_initial_uppercase':   gd_ja_t( 'setting_no_initial_uppercase' ),
				'no_initial_space':       gd_ja_t( 'setting_no_initial_space' ),
				'no_trailing_space':      gd_ja_t( 'setting_no_trailing_space' ),
				'no_final_dot':           gd_ja_t( 'setting_no_final_dot' ),
				'no_final_other_dots':    gd_ja_t( 'setting_no_final_other_dots' ),
			},
		},
		{
			'title':    gd_ja_t( 'show_warnings_title' ),
			'settings': {
				'curly_apostrophe_warning': gd_ja_t( 'setting_curly_apostrophe_warning' ),
				'localized_quote_warning':  gd_ja_t( 'setting_localized_quote_warning' ),
			},
		},
		{
			'title':    gd_ja_t( 'ja_style_title' ),
			'settings': {
				'ja_fullwidth_ascii':      gd_ja_t( 'setting_ja_fullwidth_ascii' ),
				'ja_fullwidth_number':     gd_ja_t( 'setting_ja_fullwidth_number' ),
				'ja_space_before_half':    gd_ja_t( 'setting_ja_space_before_half' ),
				'ja_space_around_mixed':   gd_ja_t( 'setting_ja_space_around_mixed' ),
				'ja_paren_space_outside':  gd_ja_t( 'setting_ja_paren_space_outside' ),
				'ja_paren_space_inside':   gd_ja_t( 'setting_ja_paren_space_inside' ),
				'ja_terminology':          gd_ja_t( 'setting_ja_terminology' ),
				'ja_straight_quotes':      gd_ja_t( 'setting_ja_straight_quotes' ),
			},
		},
		{
			'title':    gd_ja_t( 'others_title' ),
			'settings': {
				'no_non_breaking_space':                    gd_ja_t( 'setting_no_non_breaking_space' ),
				'autocopy_string_on_translation_opened':    gd_ja_t( 'setting_autocopy' ),
				'autosubmit_bulk_copy_from_original':       gd_ja_t( 'setting_autosubmit_bulk' ),
				'force_autosubmit_bulk_copy_from_original': gd_ja_t( 'setting_force_autosubmit_bulk' ),
			},
		},
	];

	const hotkeys = {
		[gd_ja_t( 'hk_glossary_rightclick' )]: 'Right click on a Glossary term',
		[gd_ja_t( 'hk_space_boundary' )]: 'Ctrl+Shift+X',
		[gd_ja_t( 'hk_wrap_corner' )]: 'Ctrl+Shift+[',
		[gd_ja_t( 'hk_wrap_double_corner' )]: 'Ctrl+Shift+]',
		[gd_ja_t( 'hk_approve' )]: 'Ctrl+Shift+A',
		[gd_ja_t( 'hk_cancel' )]: 'Ctrl+Shift+Z',
		[gd_ja_t( 'hk_copy_original' )]: 'Ctrl+Shift+B',
		[gd_ja_t( 'hk_dismiss_current' )]: 'Ctrl+D',
		[gd_ja_t( 'hk_dismiss_all' )]: 'Ctrl+Shift+D',
		[gd_ja_t( 'hk_force_save' )]: 'Ctrl+Shift+Enter',
		[gd_ja_t( 'hk_fuzzy' )]: 'Ctrl+Shift+F',
		[gd_ja_t( 'hk_consistency' )]: 'Alt+C',
		[gd_ja_t( 'hk_next' )]: 'Page Down',
		[gd_ja_t( 'hk_prev' )]: 'Page Up',
		[gd_ja_t( 'hk_reject' )]: 'Ctrl+Shift+R',
		[gd_ja_t( 'hk_save' )]: 'Ctrl+Enter',
	};

	const container = document.createElement( 'DIV' );
	container.classList.add( 'gd_settings' );

	const input1 = document.createElement( 'INPUT' );
	input1.classList.add( 'gd_settings__radio' );
	input1.type = 'radio';
	input1.name = 'group';

	const input2 = input1.cloneNode( true );
	const input3 = input1.cloneNode( true );
	input1.id = 'gd_settings__radio1';
	input1.checked = 'checked';
	input2.id = 'gd_settings__radio2';
	input3.id = 'gd_settings__radio3';

	container.append( input1, input2, input3 );

	const tabs = document.createElement( 'DIV' );
	tabs.classList.add( 'gd_settings_tabs' );
	const tab1 = document.createElement( 'LABEL' );
	tab1.classList.add( 'gd_settings_tab' );
	const tab2 = tab1.cloneNode( true );
	const tab3 = tab1.cloneNode( true );
	tab1.id = 'gd_settings_tab1';
	tab1.htmlFor = 'gd_settings__radio1';
	tab1.textContent = gd_ja_t( 'settings_tab' );
	tab2.id = 'gd_settings_tab2';
	tab2.htmlFor = 'gd_settings__radio2';
	tab2.textContent = 'install' === gd_extension.reason ? gd_ja_t( 'welcome_tab_install' ) : gd_ja_t( 'welcome_tab_update' );
	tab3.id = 'gd_settings_tab3';
	tab3.htmlFor = 'gd_settings__radio3';
	tab3.textContent = gd_ja_t( 'gte_tools_tab' );
	container.appendChild( tabs ).append( tab1, tab2, tab3 );

	const panels = document.createElement( 'DIV' );
	panels.classList.add( 'gd_settings_panels' );
	const panel1 = document.createElement( 'DIV' );
	panel1.classList.add( 'gd_settings_panel' );
	const panel2 = panel1.cloneNode( true );
	const panel3 = panel1.cloneNode( true );
	panel1.id = 'gd_settings_panel1';
	panel2.id = 'gd_settings_panel2';
	panel3.id = 'gd_settings_panel3';
	panels.append( panel1, panel2, panel3 );
	container.appendChild( panels );

	const fragment = document.createDocumentFragment();
	const subfragment = document.createDocumentFragment();
	const asterisk = document.createElement( 'SPAN' );
	asterisk.classList.add( 'gd_asterisk' );
	asterisk.textContent = '*';
	settings_data.forEach( category => {
		fragment.appendChild( document.createElement( 'H3' ) ).appendChild( document.createTextNode( category.title ) );
		Object.entries( category.settings ).forEach( setting => {
			const setting_slug = setting[ 0 ];
			let setting_desc = setting[ 1 ];
			const input = document.createElement( 'INPUT' );
			const label = document.createElement( 'LABEL' );
			input.type = 'checkbox';
			input.id = `polykit_${setting_slug}`;
			input.checked = gd_get_setting( setting_slug ) ? 'checked' : '';

			input.addEventListener( 'click', ( event ) => {
				localStorage.setItem( 'polykit_' + setting_slug, event.target.checked );
			} );

			label.appendChild( input );
			let has_asterisk = false;
			if ( '*' === setting_desc.slice( -1 ) ) {
				has_asterisk = true;
				setting_desc = setting_desc.slice( 0, -1 );
			}
			if ( -1 === setting_desc.indexOf( '[[[' ) ) {
				label.appendChild( document.createTextNode( setting_desc ) );
			} else {
				setting_desc.split( /\[\[\[|\]\]\]/ ).forEach( ( part, part_i ) => {
					! ( part_i % 2 ) && subfragment.appendChild( document.createTextNode( part ) );
					( part_i % 2 ) && subfragment.appendChild( document.createElement( 'CODE' ) ).appendChild( document.createTextNode( part ) );
				} );
				label.appendChild( subfragment );
			}
			if ( has_asterisk ) {
				label.appendChild( asterisk.cloneNode( true ) );
			}
			fragment.appendChild( label );
		} );
	} );
	const fieldset = document.createElement( 'FIELDSET' );
	fieldset.appendChild( fragment ) && panel1.appendChild( fieldset );

	fragment.appendChild( document.createElement( 'TH' ) ).appendChild( document.createTextNode( gd_ja_t( 'hotkey_action' ) ) );
	fragment.appendChild( document.createElement( 'TH' ) ).appendChild( document.createTextNode( gd_ja_t( 'hotkey_key' ) ) );
	Object.entries( hotkeys ).forEach( hotkey => {
		const [ key, value ] = hotkey;
		const tr = document.createElement( 'TR' );
		tr.appendChild( document.createElement( 'TD' ) ).appendChild( document.createTextNode( `${key}` ) );
		tr.appendChild( document.createElement( 'TD' ) ).appendChild( document.createTextNode( `${value}` ) );
		fragment.appendChild( tr );
	} );
	const table = document.createElement( 'TABLE' );
	table.appendChild( fragment ) && panel1.appendChild( table );
	const caution_note = document.createElement( 'SPAN' );
	caution_note.style.fontWeight = 'bold';
	caution_note.style.margin = '1em 0 .2em';
	caution_note.append( asterisk, gd_ja_t( 'caution_note' ) );
	panel1.appendChild( caution_note );

	const changelog = document.createElement( 'DIV' );
	changelog.classList.add( 'gd_changelog' );
	const closeSettings = document.createElement( 'A' );
	closeSettings.classList.add( 'gd-close-settings' );
	closeSettings.textContent = gd_ja_t( 'close' );
	closeSettings.addEventListener( 'click', () => {
		gd_settings_menu.click();
	} );
	const currentVersion = '0' === gd_extension.currentVersion ? '' : gd_extension.currentVersion;
	const panel2Title = 'install' === gd_extension.reason ? gd_ja_t( 'welcome_install_title', currentVersion ) : gd_ja_t( 'welcome_update_title', currentVersion );
	changelog.appendChild( document.createElement( 'H3' ) ).appendChild( document.createTextNode( panel2Title ) );
	if ( 'install' === gd_extension.reason ) {
		changelog.appendChild( document.createElement( 'P' ) ).appendChild( document.createTextNode( gd_ja_t( 'welcome_install_intro' ) ) );
		const ul = document.createElement( 'UL' );
		const advices = {
			1: gd_ja_t( 'welcome_advice_1' ),
			2: gd_ja_t( 'welcome_advice_2' ),
			3: gd_ja_t( 'welcome_advice_3' ),
		};
		Object.values( advices ).forEach( advice => {
			ul.appendChild( document.createElement( 'LI' ) ).appendChild( document.createTextNode( advice ) );
		} );
		changelog.appendChild( ul );
		changelog.appendChild( document.createElement( 'P' ) ).appendChild( document.createTextNode( gd_ja_t( 'welcome_enjoy' ) ) );
	} else {
		const link = document.createElement( 'A' );
		link.href = 'https://github.com/wp-polyglots/wp-polyglots-ja-extension/blob/main/CHANGELOG.md';
		link.textContent = 'Check the Changelog!';
		changelog.appendChild( document.createElement( 'DIV' ) ).appendChild( document.createTextNode( gd_extension.changelog ) );
		changelog.appendChild( link );
	}
	panel2.append( closeSettings, changelog );


	const quickLinks = document.createElement( 'DIV' );
	quickLinks.classList.add( 'gd_settings_quicklinks' );
	quickLinks.innerHTML = `<p><a href="https://ja.wordpress.org/team/handbook/translation/" target="_blank" rel="noreferrer noopener">${gd_ja_t( 'handbook_link' )}</a> | <a href="https://ja.wordpress.org/team/handbook/translation/translation-style-guide/" target="_blank" rel="noreferrer noopener">${gd_ja_t( 'style_guide_link' )}</a> | <a href="https://translate.wordpress.org/locale/ja/default/glossary/" target="_blank" rel="noreferrer noopener">${gd_ja_t( 'glossary_link' )}</a></p>`;
	panel1.insertBefore( quickLinks, panel1.firstChild );


	gd_user.is_connected && gd_user.is_gte && gd_set_panel3_settings( panel3 );

	document.querySelector( '.gp-content' ).prepend( container );
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
	ja_paren_space_outside: true,
	ja_paren_space_inside: true,
	ja_terminology: true,
	ja_straight_quotes: true,
};

function gd_get_setting( key ) {
	const storageKey = `polykit_${key}`;
	const stored = localStorage.getItem( storageKey );
	if ( null === stored ) {
		return Object.prototype.hasOwnProperty.call( polykit_setting_defaults, key ) ? polykit_setting_defaults[ key ] : false;
	}
	return 'true' === stored;
}

/**
 * Add GTE Tools panel3 to settings
 *
 * @returns void
 * @param panel3 Target div element for 3rd panel
 */
function gd_set_panel3_settings( panel3 ) {
	const fragment3 = document.createDocumentFragment();
	fragment3.appendChild( document.createElement( 'H3' ) ).appendChild( document.createTextNode( 'Locale specific settings' ) );
	fragment3.appendChild( document.createElement( 'DIV' ) ).appendChild( document.createTextNode( 'GlotDict links to the Locale Glossary in the filters toolbar, so it\'s highly recommended that your locale has a Glossary.' ) );
	const styleGuide = document.createElement( 'DIV' );
	fragment3.appendChild( styleGuide );
	styleGuide.classList.add( 'gd-settings-tab3__style-guide' );
	styleGuide.appendChild( document.createElement( 'H4' ) ).appendChild( document.createTextNode( 'Customize Style Guide link' ) );
	styleGuide.appendChild( document.createElement( 'DIV' ) ).appendChild( document.createTextNode( 'By default, Style Guide links to the locale handbook - locale.wordpress.org/team/handbook - also a recommended resource for your team. However, as a GTE you can customize this link to point to a certain resource your team uses, such as a sub-page of the handbook or even an external page.' ) );
	styleGuide.appendChild( document.createElement( 'P' ) ).appendChild( document.createTextNode( 'To do so, fill in this form, click on  “Generate HTML”, then copy and paste it into the Description field of your locale glossary.' ) );
	const styleGuideForm = document.createDocumentFragment();

	const styleGuideURLLabel = document.createElement( 'LABEL' );
	styleGuideURLLabel.htmlFor = 'gd-styleguide-url';
	styleGuideURLLabel.classList.add( 'gd-settings-label' );
	styleGuideURLLabel.textContent = 'Enter an URL for the Style Guide link:';

	const styleGuideURLInput = document.createElement( 'INPUT' );
	styleGuideURLInput.type = 'text';
	styleGuideURLInput.size = 100;
	styleGuideURLInput.name = 'gd-styleguide-url';
	styleGuideURLInput.id = 'gd-styleguide-url';
	styleGuideURLInput.placeholder = 'https://en-gb.wordpress.org/translations/';
	styleGuideURLInput.setAttribute( 'style', 'width: 98%!important' );

	const styleGuideMenuLabel = document.createElement( 'LABEL' );
	styleGuideMenuLabel.htmlFor = 'gd-styleguide-menu';
	styleGuideMenuLabel.classList.add( 'gd-settings-label' );
	styleGuideMenuLabel.textContent = 'Enter a title for the Style Guide link:';

	const styleGuideMenuInput = document.createElement( 'INPUT' );
	styleGuideMenuInput.type = 'text';
	styleGuideMenuInput.size = 30;
	styleGuideMenuInput.name = 'gd-styleguide-menu';
	styleGuideMenuInput.id = 'gd-styleguide-menu';
	styleGuideMenuInput.placeholder = 'Style guide';

	const styleGuideGeneratorButton = document.createElement( 'BUTTON' );
	styleGuideGeneratorButton.id = 'gd-styleguide-btn';
	styleGuideGeneratorButton.type = 'button';
	styleGuideGeneratorButton.style.margin = '10px 0';
	styleGuideGeneratorButton.textContent = 'Generate HTML';

	const styleGuideHTMLCode = document.createElement( 'TEXTAREA' );
	styleGuideHTMLCode.id = 'gd-styleguide-html';
	styleGuideHTMLCode.placeholder = 'Copy and paste this generated HTML in the Description field of your locale glossary.';
	styleGuideHTMLCode.rows = 5;
	styleGuideHTMLCode.setAttribute( 'style', 'width: 98%!important' );

	styleGuideForm.append( styleGuideMenuLabel, styleGuideMenuInput, styleGuideURLLabel, styleGuideURLInput, styleGuideGeneratorButton, styleGuideHTMLCode );
	fragment3.appendChild( styleGuideForm );
	panel3.appendChild( fragment3 );

	styleGuideGeneratorButton.addEventListener( 'click', () => {
		styleGuideURLInput.style.border = '' === styleGuideURLInput.value ? 'red 1px solid' : 'green 1px solid';
		styleGuideMenuInput.style.border = '' === styleGuideMenuInput.value ? 'red 1px solid' : 'green 1px solid';
		if ( '' === styleGuideURLInput.value || '' === styleGuideMenuInput.value ) {
			return;
		}
		styleGuideHTMLCode.value = `<a href="${styleGuideURLInput.value}" id="gd-guide-link" data-title="${styleGuideMenuInput.value}">${styleGuideMenuInput.value}</a>`;
	} );
}
