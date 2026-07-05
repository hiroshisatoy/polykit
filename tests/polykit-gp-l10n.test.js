'use strict';

const assert = require( 'assert' );
const fs = require( 'fs' );
const path = require( 'path' );
const vm = require( 'vm' );

const strings = JSON.parse(
	fs.readFileSync( path.join( __dirname, '..', 'languages', 'ja', 'glotpress.json' ), 'utf8' )
);
const context = {
	input: '\n\tSet / Sub Project\n',
	window: {
		polykit_gp_strings: strings,
	},
};
vm.createContext( context );
vm.runInContext(
	fs.readFileSync( path.join( __dirname, '..', 'js', 'polykit-gp-l10n.js' ), 'utf8' ),
	context
);

assert.strictEqual(
	vm.runInContext( 'polykit_gp_translate_text( input )', context ),
	'\n\tセット / サブプロジェクト\n'
);
context.input = 'Filter ↓ • All\u00a0(26) • Translated\u00a0(26)';
assert.strictEqual(
	vm.runInContext( 'polykit_gp_translate_text( input )', context ),
	'フィルター ↓ • すべて\u00a0(26) • 翻訳済み\u00a0(26)'
);
context.input = 'Search: By: Order:';
assert.strictEqual(
	vm.runInContext( 'polykit_gp_translate_text( input )', context ),
	'検索: 並び替え項目: 並び順:'
);

context.breadcrumbChild = {
	closest( selector ) {
		return selector.includes( '.gp-content .breadcrumb' ) ? this : null;
	},
};
assert.strictEqual(
	vm.runInContext( 'polykit_gp_should_skip_element( breadcrumbChild )', context ),
	true
);

context.stickyHeaderChild = {
	closest( selector ) {
		return selector.includes( '#polykit-sticky-header' ) ? this : null;
	},
};
assert.strictEqual(
	vm.runInContext( 'polykit_gp_should_skip_element( stickyHeaderChild )', context ),
	false
);
