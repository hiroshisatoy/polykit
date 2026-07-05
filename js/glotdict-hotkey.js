/**
 * Add the hotkeys in GlotPress
 *
 * @returns void
 */
function gd_hotkeys() {
	jQuery( $gp.editor.table ).off( 'keydown', 'tr.editor textarea', $gp.editor.hooks.keydown );
	key.filter = function( event ) {
		const tagName = ( event.target || event.srcElement ).tagName;
		key.setScope( /^(SELECT)$/.test( tagName ) ? 'input' : 'other' );
		return true;
	};
	key( 'ctrl+shift+enter', () => {
		if ( jQuery( '.editor:visible' ).length > 0 ) {
			jQuery( '.editor:visible .discard-glotdict' ).trigger( 'click' );
			jQuery( '.editor:visible .discard-warning' ).trigger( 'click' );
			jQuery( '.editor:visible .translation-actions button.translation-actions__save' ).addClass( 'forcesubmit' ).trigger( 'click' );
		} else {
			alert( gd_ja_t( 'alert_no_editor' ) );
		}
		return false;
	} );
	key( 'ctrl+enter', () => {
		if ( jQuery( '.editor:visible' ).length > 0 ) {
			jQuery( '.editor:visible .translation-actions button.translation-actions__save' ).trigger( 'click' );
		} else {
			alert( gd_ja_t( 'alert_no_editor' ) );
		}
		return false;
	} );
	key( 'ctrl+shift+z', () => {
		if ( jQuery( '.editor:visible' ).length > 0 ) {
			jQuery( '.editor:visible .panel-header-actions .panel-header-actions__cancel' ).trigger( 'click' );
		}
		return false;
	} );
	key( 'ctrl+shift+a', () => {
		if ( jQuery( '.editor:visible .translation-actions button.translation-actions__save' ).length > 0 ) {
			jQuery( '.editor:visible .translation-actions button.translation-actions__save' ).trigger( 'click' );
		} else {
			alert( gd_ja_t( 'alert_no_approve' ) );
		}
		return false;
	} );
	key( 'ctrl+shift+b', () => {
		if ( jQuery( '.editor:visible .textareas' ).length > 1 ) {
			jQuery( '.editor:visible .translation-form-list button' ).each( ( index, item ) => {
				jQuery( item ).trigger( 'click' );
				jQuery( '.editor:visible .translation-actions__copy' ).trigger( 'click' );
			} );
		} else {
			if ( jQuery( '.editor:visible .translation-actions__copy' ).length > 0 ) {
				jQuery( '.editor:visible .translation-actions__copy' ).trigger( 'click' );
			}
		}
		return false;
	} );
	key( 'ctrl+shift+f', () => {
		if ( jQuery( '.editor:visible .fuzzy' ).length > 0 ) {
			jQuery( '.editor:visible .fuzzy' ).trigger( 'click' );
		}
		return false;
	} );
	key( 'ctrl+shift+r', () => {
		if ( jQuery( '.editor:visible .meta button.reject' ).length > 0 ) {
			jQuery( '.editor:visible .meta button.reject' ).trigger( 'click' );
		} else {
			alert( gd_ja_t( 'alert_no_reject' ) );
		}
		return false;
	} );
	key( 'ctrl+shift+x', () => {
		const textarea = jQuery( 'textarea.foreign-text:visible:first' )[ 0 ];
		if ( ! textarea ) {
			return false;
		}
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const text = textarea.value;
		let insert = ' ';
		if ( start > 0 && end < text.length ) {
			const before = text.charAt( start - 1 );
			const after = text.charAt( end );
			const needsBefore = /[\u3040-\u9FFF]/.test( before ) && /[A-Za-z0-9]/.test( after );
			const needsAfter = /[A-Za-z0-9]/.test( before ) && /[\u3040-\u9FFF]/.test( after );
			if ( needsBefore || needsAfter ) {
				textarea.value = text.slice( 0, start ) + insert + text.slice( end );
				textarea.selectionStart = textarea.selectionEnd = start + insert.length;
			}
		}
		return false;
	} );
	key( 'ctrl+shift+[', () => {
		const textarea = jQuery( 'textarea.foreign-text:visible:first' )[ 0 ];
		if ( ! textarea ) {
			return false;
		}
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const selected = textarea.value.slice( start, end );
		const wrapped = `「${selected}」`;
		textarea.value = textarea.value.slice( 0, start ) + wrapped + textarea.value.slice( end );
		textarea.selectionStart = start;
		textarea.selectionEnd = start + wrapped.length;
		return false;
	} );
	key( 'ctrl+shift+]', () => {
		const textarea = jQuery( 'textarea.foreign-text:visible:first' )[ 0 ];
		if ( ! textarea ) {
			return false;
		}
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const selected = textarea.value.slice( start, end );
		const wrapped = `『${selected}』`;
		textarea.value = textarea.value.slice( 0, start ) + wrapped + textarea.value.slice( end );
		textarea.selectionStart = start;
		textarea.selectionEnd = start + wrapped.length;
		return false;
	} );
	key( 'ctrl+d', () => {
		jQuery( '.editor:visible .discard-glotdict' ).trigger( 'click' );
		jQuery( '.editor:visible .discard-warning' ).trigger( 'click' );
		return false;
	} );
	key( 'ctrl+shift+d', () => {
		jQuery( '.discard-glotdict' ).trigger( 'click' );
		jQuery( '.discard-warning' ).trigger( 'click' );
		return false;
	} );
	key( 'pageup', () => {
		$gp.editor.prev();
		return false;
	} );
	key( 'pagedown', () => {
		$gp.editor.next();
		return false;
	} );
	key( 'alt+c', () => {
		document.querySelectorAll( '.gd-consistency' ).forEach( ( el ) => { gd_do_consistency( el ); } );
		return false;
	} );
}
