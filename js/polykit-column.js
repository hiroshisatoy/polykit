function polykit_has_native_inline_actions() {
	return document.querySelector( '#translations td.inline-actions' ) !== null;
}

function polykit_add_column() {
	if ( polykit_has_native_inline_actions() ) {
		polykit_setup_native_inline_actions();
		return;
	}

	const header = document.querySelector( '#translations thead tr' );
	const thCount = header.querySelectorAll( 'th' ).length;
	if ( thCount < 6 ) {
		jQuery( '#translations thead tr' ).append( '<th></th>' );
	}
	jQuery( '#translations tr.preview' ).each( function() {
		if ( jQuery( this ).find( 'td' ).length < 5 ) {
			polykit_add_column_buttons( this );
		}
	} );
}

function polykit_setup_native_inline_actions() {
	jQuery( '#translations tr.preview' ).each( function() {
		polykit_enhance_inline_action_buttons( this );
	} );
	jQuery( $gp.editor.table ).onFirst( 'click', 'td.inline-actions .inline-action', polykit_inline_action_loading );
}

function polykit_enhance_inline_action_buttons( tr_preview ) {
	if ( tr_preview.classList.contains( 'untranslated' ) ) {
		return;
	}

	const inline_actions = tr_preview.querySelector( 'td.inline-actions' );
	if ( ! inline_actions ) {
		return;
	}

	inline_actions.querySelectorAll( '.inline-action' ).forEach( ( button ) => {
		button.classList.add( 'polykit-button' );
		if ( button.classList.contains( 'inline-action-approve' ) ) {
			button.classList.add( 'approve' );
			button.title = polykit_t( 'approve' );
		}
		if ( button.classList.contains( 'inline-action-reject' ) ) {
			button.classList.add( 'reject' );
			button.title = polykit_t( 'reject' );
		}
		if ( button.classList.contains( 'inline-action-fuzzy' ) ) {
			button.classList.add( 'fuzzy' );
			button.title = polykit_t( 'set_fuzzy' );
		}
		if ( ! button.querySelector( 'strong' ) && button.textContent.trim() ) {
			const glyph = button.textContent.trim();
			button.textContent = '';
			const strong = document.createElement( 'strong' );
			strong.textContent = glyph;
			button.appendChild( strong );
		}
	} );
}

function polykit_inline_action_loading( e ) {
	const button = ( 'BUTTON' === e.target.nodeName ) ? e.target : e.target.closest( 'button' );
	if ( ! button || button.disabled ) {
		return;
	}
	const strong = button.querySelector( 'strong' );
	button.style.color = '#afafaf';
	if ( strong ) {
		strong.classList.add( 'polykit-btn-action' );
	}
}

function polykit_add_column_buttons( tr_preview ) {
	const td_buttons = document.createElement( 'TD' );
	tr_preview.append( td_buttons );
	if ( tr_preview.nextElementSibling != null ) {
		tr_preview.nextElementSibling.querySelectorAll( '.status-actions button.approve,.status-actions button.reject,.status-actions button.fuzzy' ).forEach( ( button ) => {
			button.removeAttribute( 'tabindex' );
			const clone_button = button.cloneNode( true );
			clone_button.classList.add( 'polykit-button' );
			clone_button.addEventListener( 'click', ( ev ) => {
				const clicked_button = ( 'BUTTON' === ev.target.parentElement.nodeName ) ? ev.target.parentElement : ev.target;
				if ( ! clicked_button ) { return; }
				const strong = clicked_button.querySelector( 'strong' );
				clicked_button.disabled = true;
				clicked_button.style.color = '#afafaf';
				if ( strong ) {
					strong.classList.add( 'polykit-btn-action' );
				}
				const editor = clicked_button.closest( 'tr.preview' ).nextElementSibling;
				const status_classes = clicked_button.classList;
				status_classes.remove( 'button', 'polykit-button', 'is-primary' );
				let new_status = status_classes[0];
				new_status = 'approve' === new_status ? 'current' : new_status;
				new_status = 'reject' === new_status ? 'rejected' : new_status;
				$gp.editor.show( jQuery( clicked_button ) );
				$gp.editor.set_status( jQuery( clicked_button ), new_status );
				if ( editor ) {
					editor.style.display = 'none';
				}
				clicked_button.closest( 'tr.preview' ).style.display = 'table-row';
			} );
			if ( ! tr_preview.classList.contains( 'untranslated' ) ) {
				if ( clone_button.classList.contains( 'approve' ) ) {
					clone_button.title = polykit_t( 'approve' );
				}
				if ( clone_button.classList.contains( 'reject' ) ) {
					clone_button.title = polykit_t( 'reject' );
				}
				if ( clone_button.classList.contains( 'fuzzy' ) ) {
					clone_button.title = polykit_t( 'set_fuzzy' );
				}
				td_buttons.append( clone_button );
			}
		} );
	}
}
