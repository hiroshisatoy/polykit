# Chrome Web Store 掲載素材（準備中）

このフォルダーには、PolyKit の掲載文案と画像をまとめています。**ストアへのアップロード・申請・公開は行っていません。** プライバシーポリシーは運営者確認前の草案です。

画像の基準は、公開済みの `main` コミット `6c4c8836eef7e89ca9c5fd90fd88ecce8238d86e`（拡張機能 v1.0.1）です。未コミットの実装は撮影に使っていません。

## 掲載画像

| ファイル | 撮影した実際の画面・意図 |
| --- | --- |
| [01-translation-list.png](screenshots/01-translation-list.png) | 公開翻訳一覧。日本語化した画面と行ごとのチェック状態。 |
| [02-warning-filter.png](screenshots/02-warning-filter.png) | 警告のある行だけを表示した状態。チェック内容を確認できることを示す。 |
| [03-translation-detail.png](screenshots/03-translation-detail.png) | 警告付き翻訳の詳細。原文、訳文、文字数、検索補助、警告を示す。ログアウト状態のため編集欄は利用不可。 |
| [04-settings.png](screenshots/04-settings.png) | 汎用チェックの設定。チェックの有効化と重要度の選択。 |
| [05-japanese-style-settings.png](screenshots/05-japanese-style-settings.png) | 日本語スタイルガイドの設定。項目ごとの重要度の選択。 |

5枚とも **1280×800 PNG、RGB・透過なし**です。公開中の translate.wordpress.org を、ログアウトした専用プロファイルの Chrome for Testing で表示し、PolyKit が追加した実際の UI を撮影しました。撮影時の公開プロフィール名は、3枚目に限り CSS で非表示にしています。翻訳の送信・保存・承認はしていません。サイト側の内容が変わると再撮影結果も変わります。

- [icon-128.png](icon-128.png)：拡張機能に同梱済みの `icons/icon-128.png` のコピー。128×128 PNG、透過あり。アイコン本体の外側にはおよそ16pxの透明な余白があります。
- [promo-small.png](promo-small.png)：440×280 PNG、透過なし。既存の `icons/polykit_logo.svg` を使った文字なしのブランド画像です。[promo-small.svg](promo-small.svg) を原稿として保存しています。

[Chrome Web Store の公式画像要件](https://developer.chrome.com/docs/webstore/images)では、128pxアイコン、440×280の小プロモ画像、少なくとも1枚のスクリーンショットが必要です。スクリーンショットは1〜5枚、1280×800または640×400で、角は直角・余白なしです。これらのファイルはサイズを確認済みです。

## 再撮影

Chrome for Testing を使用してください。通常利用している Chrome のプロファイルや設定は使いません。コードは上記コミットの実装と、ストア素材用のローカルファイルを含むcheckoutを指定します。

1. 空の一時プロファイルで Chrome for Testing を起動します。`CFT_BINARY` には実行ファイルのパスを指定してください。

   ```sh
   CFT_BINARY="/path/to/Google Chrome for Testing"
   PROFILE_DIR="$(mktemp -d)"
   "$CFT_BINARY" --headless=new --no-first-run --disable-default-apps --disable-sync \
     --disable-background-networking --user-data-dir="$PROFILE_DIR" \
     --disable-extensions-except="$(pwd)" --load-extension="$(pwd)" \
     --remote-debugging-port=9225 about:blank
   ```

2. 別のターミナルで、このリポジトリのルートから撮影スクリプトを実行します。スクリプトはログアウト状態を確認してから、公開ページを閲覧し、スクリーンショット5枚と小プロモ画像を再生成します。

   ```sh
   deno run '--allow-net=localhost,127.0.0.1,[::1]' \
     --allow-env=POLYKIT_CDP_URL --allow-write=store/chrome-web-store \
     store/chrome-web-store/capture-screenshots.ts
   cp icons/icon-128.png store/chrome-web-store/icon-128.png
   ```

撮影スクリプトは翻訳の保存・承認を実行しません。掲載前にスクリーンショットの内容と個人名の有無を目視で再確認してください。

## 文章と申請前の確認

- [listing.ja.txt](listing.ja.txt)：名前、短い説明、詳しい説明、単一目的の草案。
- [permissions.ja.txt](permissions.ja.txt)：権限を説明する草案。`activeTab` の必要性は未確認です。
- [privacy-draft.ja.md](privacy-draft.ja.md)：公開前確認用のプライバシーポリシー草案。運営者、連絡先、日付、公開 URL が未確定です。
- [submission-checklist.ja.md](submission-checklist.ja.md)：提出前に確定・確認する事項。

`pack-ext.js` は同梱ファイルの許可リストを使います。この `store/` フォルダーは拡張機能用の ZIP と XPI に含まれません。
