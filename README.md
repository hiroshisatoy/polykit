# PolyKit

translate.wordpress.org 向けの日本語翻訳特化ブラウザ拡張機能です。

## 由来

PolyKit は [GlotDict](https://github.com/Mte90/GlotDict)
をベースにしたフォークです。元プロジェクトの翻訳支援機能を引き継ぎつつ、日本語コミュニティの翻訳ワークフロー向けに再構成しています。

## 機能

- 日本語スタイルガイドに基づく翻訳チェック（半角/全角、スペース、括弧、訳語統一など）
- 用語集チェック、Consistency 候補、レビューボタン
- クイック Approve / Reject / Fuzzy
- 文字数カウント（日本語向け）
- 日本語ハンドブック・スタイルガイド・用語集へのクイックリンク
- ショートカットキー（「」『』挿入、全角/半角境界スペースなど）

## インストール（開発版）

Chrome は **Manifest V3** 対応が必要です（`manifest.json` は MV3 形式です）。

```bash
deno task pack
```

### Chrome（推奨: フォルダを直接読み込み）

1. `chrome://extensions/` を開く
2. 「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」でこのプロジェクトフォルダを選択

または生成された `PolyKit_v1.0.0.zip` を読み込む。

### Firefox

1. `about:debugging` → 「この Firefox」→「一時的なアドオンを読み込む」
2. 生成した `.xpi` を選択

## 注意

- **GlotDict 本体とは併用しないでください**（DOM 操作が重複します）
- ページ内設定は `polykit_` 接頭辞の `localStorage` に保存されます
- ポップアップと共有する設定は `chrome.storage.local` を正本とします

## 設計資料

- [システム全体の設計](docs/architecture.md)
- [ポップアップと画面翻訳設定の設計](docs/popup-and-interface-translation-design.md)

## ライセンス

GPL-2.0。GlotDict 由来のコードを含みます（[Mte90/GlotDict](https://github.com/Mte90/GlotDict)）。
