# PolyKit

[translate.wordpress.org][] 向けの日本語翻訳支援拡張機能です。

日本語のスタイルガイドに沿ったチェック、用語の確認、レビュー操作を、翻訳画面の上から行えます。
[GlotDict][] を基に、日本語コミュニティの作業向けに再構成しています。

## 機能

- 半角と全角、スペース、括弧、訳語の統一など、日本語スタイルガイドに基づくチェック
- 用語集の確認と、既存訳から選ぶ Consistency 候補
- Approve、Reject、Fuzzy のクイック操作
- 原文の一括コピーと、複数候補の置き換え
- 日本語向けの文字数表示
- ハンドブック、スタイルガイド、用語集へのリンク
- 翻訳画面と PolyKit の表示を日本語にする設定

## 動作環境

- Chrome（Manifest V3）
- Firefox

対象は [translate.wordpress.org][] です。
Playground のページでは動きません。

GlotDict とは同時に有効にしないでください。
画面への追加処理が重なります。

## インストール

パッケージは [Releases][] から入手します。

### Chrome

1. `PolyKit_vX.Y.Z.zip` を展開する。
1. `chrome://extensions/` を開く。
1. デベロッパーモードを有効にする。
1. 「パッケージ化されていない拡張機能を読み込む」で、展開したフォルダを選ぶ。

`PolyKit_vX.Y.Z.crx` は、デベロッパーモードを有効にして Chrome を再起動したあと、`chrome://extensions/` にドロップして読み込めます。
Chrome は Chrome ウェブストア以外の CRX を拒否することがあります。
その場合は ZIP を使ってください。

### Firefox

1. `about:debugging` を開く。
1. 「この Firefox」から「一時的なアドオンを読み込む」を選ぶ。
1. `PolyKit_vX.Y.Z.xpi` を選ぶ。

## 使い方

1. 拡張機能を読み込んだ状態で、translate.wordpress.org の翻訳画面を開く。
1. ツールバーの PolyKit アイコンから、画面の日本語化と設定を開く。
1. 翻訳行で、チェック結果、文字数、レビューボタン、用語や既存訳の候補を確認する。

設定では、チェック項目の有無と重要度を変えられます。

## 開発

依存関係の取得と実行には [Deno][] を使います。

```sh
deno task check
```

整形、JavaScript の構文、辞書、回帰テストを確認します。

パッケージを手元で作る場合は、次を実行します。

```sh
deno task pack
```

Chrome 用の ZIP と CRX、Firefox 用の XPI がリポジトリ直下にできます。
初回は署名鍵 `key.pem` も作ります。
拡張機能 ID を維持するため、このファイルは保管し、リポジトリには含めないでください。

ブラウザ上の表示と操作は、次のローカルページで確認できます。

```sh
python3 -m http.server 8766 --bind 127.0.0.1
```

<http://127.0.0.1:8766/tests/browser-smoke.html> を開きます。
このページは保存や承認を行いません。
実サイトでの確認は別途必要です。

### リリース

`manifest.json` の `version` に `v` を付けたタグ（例: `v1.0.1`）を push すると、GitHub Actions が Release を作成します。
添付されるファイルは `PolyKit_vX.Y.Z.zip`、`PolyKit_vX.Y.Z.crx`、`PolyKit_vX.Y.Z.xpi` です。
CRX を付けるには、`key.pem` の内容を secret `CRX_PRIVATE_KEY` に登録します。

## ドキュメント

- [システム全体の設計](docs/architecture.md)
- [ポップアップと画面翻訳設定の設計](docs/popup-and-interface-translation-design.md)

## ライセンス

[GPL-2.0](LICENSE)。
GlotDict 由来のコードを含みます（[GlotDict][]）。

[translate.wordpress.org]: https://translate.wordpress.org/
[GlotDict]: https://github.com/Mte90/GlotDict
[Releases]: https://github.com/hiroshisatoy/polykit/releases
[Deno]: https://deno.land/
