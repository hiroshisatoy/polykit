'use strict';

const polykit_locale_terminology_rules = [
	{ wrong: '下さい', right: 'ください' },
	{ wrong: '全て', right: 'すべて' },
	{ wrong: '既に', right: 'すでに' },
];

function polykit_mask_locale_text( text ) {
	return text
		.replace( /%(\d+\$)?[sd]/g, '\x01' )
		.replace( /<[^>]+>/g, '\x01' )
		.replace( /https?:\/\/\S+/g, '\x01' );
}

/**
 * 1-5: 丸括弧の外側スペース。1-6 の内側密着 (例: WordPress) は対象外。
 * 1-4: 。、」』などの直後・直前はスペース不要。
 *
 * @param {string} masked
 * @returns {boolean}
 */
function polykit_paren_needs_outside_space( masked ) {
	const no_space_before_open = '。、！？；：」』』])％%「『';
	const no_space_after_close = '。、！？；：」』』[(％%「『';

	for ( let i = 1; i < masked.length; i++ ) {
		if ( '(' !== masked[ i ] ) {
			continue;
		}
		const before = masked[ i - 1 ];
		if ( /[\s\u00A0]/.test( before ) || no_space_before_open.includes( before ) ) {
			continue;
		}
		if ( /[\u3040-\u9FFFA-Za-z0-9]/.test( before ) ) {
			return true;
		}
	}

	for ( let i = 0; i < masked.length - 1; i++ ) {
		if ( ')' !== masked[ i ] ) {
			continue;
		}
		const after = masked[ i + 1 ];
		if ( /[\s\u00A0]/.test( after ) || no_space_after_close.includes( after ) ) {
			continue;
		}
		if ( /[\u3040-\u9FFFA-Za-z0-9]/.test( after ) ) {
			return true;
		}
	}

	return false;
}

function polykit_validate_locale( e, selector, text, discard ) {
	if ( 'ja' !== polykit_get_lang() ) {
		return 0;
	}
	let howmany = 0;
	const masked = polykit_mask_locale_text( text );

	if ( polykit_get_setting( 'ja_fullwidth_ascii' ) ) {
		const fullwidth = masked.match( /[Ａ-Ｚａ-ｚ０-９！？]/g );
		if ( fullwidth ) {
			const unique = [ ...new Set( fullwidth ) ].slice( 0, 5 ).join( '' );
			jQuery( '.textareas', selector ).prepend( polykit_get_warning( polykit_t( 'ja_fullwidth_ascii', unique ), discard ) );
			howmany++;
		}
	}

	if ( polykit_get_setting( 'ja_fullwidth_number' ) ) {
		const nums = masked.match( /[０-９]+/g );
		if ( nums ) {
			jQuery( '.textareas', selector ).prepend( polykit_get_warning( polykit_t( 'ja_fullwidth_number', nums[ 0 ] ), discard ) );
			howmany++;
		}
	}

	if ( polykit_get_setting( 'ja_space_before_half' ) ) {
		const bad = masked.match( /[^\s\u00A0][!?]/g );
		if ( bad ) {
			jQuery( '.textareas', selector ).prepend( polykit_get_warning( polykit_t( 'ja_space_before_half', bad[ 0 ] ), discard ) );
			howmany++;
		}
	}

	if ( polykit_get_setting( 'ja_space_around_mixed' ) ) {
		const patterns = [
			/[\u3040-\u9FFF\u3000-\u303F][A-Za-z0-9]/,
			/[A-Za-z0-9][\u3040-\u9FFF]/,
		];
		const boundary_exceptions = /[『「、。』」：]/;
		for ( const pattern of patterns ) {
			const match = masked.match( pattern );
			if ( match && ! boundary_exceptions.test( match[ 0 ] ) ) {
				jQuery( '.textareas', selector ).prepend( polykit_get_warning( polykit_t( 'ja_space_around_mixed', match[ 0 ] ), discard ) );
				howmany++;
				break;
			}
		}
	}

	if ( polykit_get_setting( 'ja_space_after_comma' ) ) {
		if ( /、[ \u00A0\u3000]/.test( masked ) ) {
			jQuery( '.textareas', selector ).prepend( polykit_get_warning( polykit_t( 'ja_space_after_comma' ), discard ) );
			howmany++;
		}
	}

	if ( polykit_get_setting( 'ja_colon_spacing' ) ) {
		if ( /[ \u00A0\u3000]:/.test( masked ) ) {
			jQuery( '.textareas', selector ).prepend( polykit_get_warning( polykit_t( 'ja_colon_before' ), discard ) );
			howmany++;
		} else if ( /:(?!\s)[A-Za-z\u3040-\u9FFF]/.test( masked ) && ! /\d:\d/.test( masked ) ) {
			jQuery( '.textareas', selector ).prepend( polykit_get_warning( polykit_t( 'ja_colon_after' ), discard ) );
			howmany++;
		}
	}

	if ( polykit_get_setting( 'ja_digit_spacing' ) ) {
		const digit_space = masked.match( /\d[ \u00A0\u3000]+[件個年月日時分秒回人文字列バージョン％%]/ );
		if ( digit_space ) {
			jQuery( '.textareas', selector ).prepend( polykit_get_warning( polykit_t( 'ja_digit_spacing', digit_space[ 0 ] ), discard ) );
			howmany++;
		}
	}

	if ( polykit_get_setting( 'ja_paren_space_outside' ) ) {
		if ( polykit_paren_needs_outside_space( masked ) ) {
			jQuery( '.textareas', selector ).prepend( polykit_get_warning( polykit_t( 'ja_paren_space_outside' ), discard ) );
			howmany++;
		}
	}

	if ( polykit_get_setting( 'ja_paren_space_inside' ) ) {
		if ( /\(\s+|\s+\)/.test( masked ) ) {
			jQuery( '.textareas', selector ).prepend( polykit_get_warning( polykit_t( 'ja_paren_space_inside' ), discard ) );
			howmany++;
		}
	}

	if ( polykit_get_setting( 'ja_terminology' ) ) {
		for ( const rule of polykit_locale_terminology_rules ) {
			if ( rule.wrong === '下さい' && /差し下さい/.test( text ) ) {
				continue;
			}
			if ( text.includes( rule.wrong ) ) {
				jQuery( '.textareas', selector ).prepend( polykit_get_warning( polykit_t( 'ja_terminology_wrong', rule.right, rule.wrong ), discard ) );
				howmany++;
			}
		}
	}

	if ( polykit_get_setting( 'ja_straight_quotes' ) ) {
		const check = text.replace( /([^>"]*)"(?=[^<]*>)/g, '$1\x01' );
		if ( /[\u3040-\u9FFF]"/.test( check ) || /"[\u3040-\u9FFF]/.test( check ) ) {
			jQuery( '.textareas', selector ).prepend( polykit_get_warning( polykit_t( 'ja_straight_quotes' ), discard ) );
			howmany++;
		}
	}

	if ( howmany !== 0 ) {
		polykit_stoppropagation( e );
	}
	return howmany;
}
