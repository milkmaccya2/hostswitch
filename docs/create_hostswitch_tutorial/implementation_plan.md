# 実装計画: HostSwitchドキュメントのi18n対応

## ゴール
HostSwitchのドキュメントサイトを多言語対応（日本語・英語）にする。
デフォルトは日本語のままとし、英語モードを追加する。

## 変更内容

### 1. 設定変更
#### [MODIFY] [website/docusaurus.config.ts](file:///Users/yokoyama/git/hostswitch/website/docusaurus.config.ts)
- `i18n` 設定に `en` ロケールを追加
- Navbarに「言語切り替え」ドロップダウンを追加

### 2. 翻訳ファイルの作成

#### [NEW] [website/i18n/en/docusaurus-plugin-content-docs/current/intro.md](file:///Users/yokoyama/git/hostswitch/website/i18n/en/docusaurus-plugin-content-docs/current/intro.md)
- `docs/intro.md` の英訳版

#### [NEW] [website/i18n/en/docusaurus-plugin-content-docs/current/hostswitch-tutorial.md](file:///Users/yokoyama/git/hostswitch/website/i18n/en/docusaurus-plugin-content-docs/current/hostswitch-tutorial.md)
- `docs/hostswitch-tutorial.md` の英訳版

#### [NEW] [website/i18n/en/code.json](file:///Users/yokoyama/git/hostswitch/website/i18n/en/code.json)
- Reactコンポーネント（トップページ、機能紹介など）の翻訳データ

### 3. Reactコンポーネントの修正

#### [MODIFY] [website/src/pages/index.tsx](file:///Users/yokoyama/git/hostswitch/website/src/pages/index.tsx)
- テキストを `<Translate>` コンポーネントでラップし、多言語対応する。

#### [MODIFY] [website/src/components/HomepageFeatures/index.tsx](file:///Users/yokoyama/git/hostswitch/website/src/components/HomepageFeatures/index.tsx)
- タイトルや説明文を `<Translate>` コンポーネントでラップする。

## 検証計画
- `npm run docs:start -- --locale en` で英語モードでの起動を確認
- 言語切り替えドロップダウンが機能することを確認
- 日本語モードと英語モードでそれぞれの内容が正しく表示されるか確認
