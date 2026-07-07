'use strict';

const assert = require( 'assert' );
const fs = require( 'fs' );
const path = require( 'path' );
const vm = require( 'vm' );

const context = {};
vm.createContext( context );
vm.runInContext(
	fs.readFileSync( path.join( __dirname, '..', 'js', 'polykit-locale-validation.js' ), 'utf8' ),
	context
);

function getWarnings( original, translation ) {
	return Array.from( context.polykit_get_source_terminology_warnings( original, translation ) );
}

assert.deepStrictEqual( getWarnings( 'View settings', '設定を開く' ), [ 'ja_view_terminology' ] );
assert.deepStrictEqual( getWarnings( 'View settings', '設定を表示' ), [] );
assert.deepStrictEqual(
	getWarnings( 'Users are not allowed to edit.', '編集できません。' ),
	[ 'ja_not_allowed_terminology' ]
);
assert.deepStrictEqual(
	getWarnings( 'Users are not allowed to edit.', '編集する権限がありません。' ),
	[]
);
assert.deepStrictEqual(
	getWarnings( 'Sorry, this failed.', '申し訳ありません。失敗しました。' ),
	[ 'ja_sorry_terminology' ]
);
assert.deepStrictEqual( getWarnings( 'Open settings', '設定を開く' ), [] );
assert.strictEqual(
	context.polykit_mask_locale_text( '日本語<code>Ａ?</code>WordPress' ),
	'日本語\x01WordPress'
);
assert.strictEqual(
	context.polykit_get_unspaced_mixed_boundary( '主な理由は2つあります:' ),
	''
);
assert.strictEqual(
	context.polykit_get_unspaced_mixed_boundary( '2件のエラー' ),
	''
);
assert.strictEqual(
	context.polykit_get_unspaced_mixed_boundary( 'WordPressの使い方' ),
	'sの'
);
assert.strictEqual(
	context.polykit_get_unspaced_mixed_boundary( 'WordPress の使い方' ),
	''
);
assert.strictEqual(
	context.polykit_get_unspaced_mixed_boundary( 'こんにちは、username さん。' ),
	''
);
assert.strictEqual(
	context.polykit_get_unspaced_mixed_boundary( 'こんにちは、usernameさん。' ),
	'eさ'
);
assert.strictEqual(
	context.polykit_get_unspaced_mixed_boundary( '準備ができましたか?' ),
	'か?'
);
assert.strictEqual(
	context.polykit_get_unspaced_mixed_boundary( '準備ができましたか ?' ),
	''
);
assert.strictEqual(
	context.polykit_get_unspaced_mixed_boundary( 'ユーザー ID: username' ),
	''
);
assert.strictEqual(
	context.polykit_mixed_boundary_needs_space( 'ー', 'I' ),
	true
);
assert.strictEqual(
	context.polykit_mixed_boundary_needs_space( '、', 'u' ),
	false
);
assert.strictEqual(
	context.polykit_mixed_boundary_needs_space( 's', 'の' ),
	true
);
