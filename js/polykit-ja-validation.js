'use strict';

const gd_ja_terminology_rules = [
	{ wrong: '下さい', right: 'ください' },
	{ wrong: '全て', right: 'すべて' },
	{ wrong: '既に', right: 'すでに' },
];

function gd_ja_mask_text( text ) {
	return text
		.replace( /%(\d+\$)?[sd]/g, '\x01' )
		.replace( /<[^>]+>/g, '\x01' )
		.replace( /https?:\/\/\S+/g, '\x01' );
}

function gd_validate_ja( e, selector, text, discard ) {
	let howmany = 0;
	const masked = gd_ja_mask_text( text );

	if ( gd_get_setting( 'ja_fullwidth_ascii' ) ) {
		const fullwidth = masked.match( /[Ａ-Ｚａ-ｚ０-９！？]/g );
		if ( fullwidth ) {
			const unique = [ ...new Set( fullwidth ) ].slice( 0, 5 ).join( '' );
			jQuery( '.textareas', selector ).prepend( gd_get_warning( gd_ja_t( 'ja_fullwidth_ascii', unique ), discard ) );
			howmany++;
		}
	}

	if ( gd_get_setting( 'ja_fullwidth_number' ) ) {
		const nums = masked.match( /[０-９]+/g );
		if ( nums ) {
			jQuery( '.textareas', selector ).prepend( gd_get_warning( gd_ja_t( 'ja_fullwidth_number', nums[ 0 ] ), discard ) );
			howmany++;
		}
	}

	if ( gd_get_setting( 'ja_space_before_half' ) ) {
		const bad = masked.match( /[^\s\u00A0][!?]/g );
		if ( bad ) {
			jQuery( '.textareas', selector ).prepend( gd_get_warning( gd_ja_t( 'ja_space_before_half', bad[ 0 ] ), discard ) );
			howmany++;
		}
	}

	if ( gd_get_setting( 'ja_space_around_mixed' ) ) {
		const patterns = [
			/[\u3040-\u9FFF\u3000-\u303F][A-Za-z0-9]/,
			/[A-Za-z0-9][\u3040-\u9FFF]/,
		];
		for ( const pattern of patterns ) {
			const match = masked.match( pattern );
			if ( match && ! /[、。』」]/.test( match[ 0 ] ) ) {
				jQuery( '.textareas', selector ).prepend( gd_get_warning( gd_ja_t( 'ja_space_around_mixed', match[ 0 ] ), discard ) );
				howmany++;
				break;
			}
		}
	}

	if ( gd_get_setting( 'ja_paren_space_outside' ) ) {
		if ( /[^\s\u00A0]\(/.test( masked ) || /\)[^\s\u00A0。、]/.test( masked ) ) {
			jQuery( '.textareas', selector ).prepend( gd_get_warning( gd_ja_t( 'ja_paren_space_outside' ), discard ) );
			howmany++;
		}
	}

	if ( gd_get_setting( 'ja_paren_space_inside' ) ) {
		if ( /\(\s|\s\)/.test( masked ) ) {
			jQuery( '.textareas', selector ).prepend( gd_get_warning( gd_ja_t( 'ja_paren_space_inside' ), discard ) );
			howmany++;
		}
	}

	if ( gd_get_setting( 'ja_terminology' ) ) {
		for ( const rule of gd_ja_terminology_rules ) {
			if ( rule.wrong === '下さい' && /差し下さい/.test( text ) ) {
				continue;
			}
			if ( text.includes( rule.wrong ) ) {
				jQuery( '.textareas', selector ).prepend( gd_get_warning( gd_ja_t( 'ja_terminology_wrong', rule.right, rule.wrong ), discard ) );
				howmany++;
			}
		}
	}

	if ( gd_get_setting( 'ja_straight_quotes' ) ) {
		const check = text.replace( /([^>"]*)"(?=[^<]*>)/g, '$1\x01' );
		if ( /[\u3040-\u9FFF]"/.test( check ) || /"[\u3040-\u9FFF]/.test( check ) ) {
			jQuery( '.textareas', selector ).prepend( gd_get_warning( gd_ja_t( 'ja_straight_quotes' ), discard ) );
			howmany++;
		}
	}

	if ( howmany !== 0 ) {
		gd_stoppropagation( e );
	}
	return howmany;
}
