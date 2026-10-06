# Chrome Web Store 申請前の確認

このフォルダーは提出用の草案です。ストアへのアップロード、登録、公開は行っていません。

- [ ] プライバシーポリシーの公開 URL、最終更新日、運営者、問い合わせ先を確定する。
- [ ] ストアの公開者名、カテゴリ、サポート URL、配布地域を確定する。
- [ ] `activeTab` の必要性と、ホスト権限・コンテンツスクリプトが HTTP を含む範囲を検討する。今回の準備では権限を変更していない。
- [ ] 提出 ZIP と掲載文、権限・プライバシー申告の内容を照合する。外部 JavaScript が含まれないかも ZIP で再確認する。
- [ ] 実サイトで最終確認する。撮影のために翻訳の送信・保存・承認は行わない。
- [ ] ユーザーデータ申告の選択肢を実装と照合する。「データを一切扱わない」「外部送信しない」とは申告しない。ウェブサイトコンテンツは申告候補。URL、ログイン・権限情報、認証通信の分類は申請画面の定義を確認して決める。現時点ですべて未選択とする判断はできない。

## 画像とテキストの目安

- 必須画像：128×128 PNG の拡張機能アイコン、440×280 の小プロモ画像、スクリーンショット1〜5枚。スクリーンショットは1280×800が推奨され、640×400も使用可能。1400×560 のマーキー画像は任意。
- 名前：75文字以内。短い説明：132文字以内。
- 画像は実際の利用体験を示し、角は直角、余白を足さない。撮影時に実データの送信・保存・承認はしない。

## 公式資料

- [画像要件](https://developer.chrome.com/docs/webstore/images)
- [ユーザーデータ FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [プライバシーポリシー](https://developer.chrome.com/docs/webstore/program-policies/privacy)
- [権限ポリシー](https://developer.chrome.com/docs/webstore/program-policies/permissions)
- [Tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs)
- [名前の要件](https://developer.chrome.com/docs/extensions/reference/manifest/name)
- [説明の要件](https://developer.chrome.com/docs/extensions/reference/manifest/description)

本文案と権限・プライバシー案はソースコードの静的確認に基づきます。実行時通信と提出 ZIP の監査は未実施です。
