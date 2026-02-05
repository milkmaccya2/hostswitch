# Task List

- [x] HostSwitchの機能を理解する
- [x] Docusaurusの構成を確認する
- [x] `website/docs/hostswitch-tutorial.md` (チュートリアル) を作成する
- [x] `website/docs/hostswitch-tutorial.md` のサイドバー位置を修正する
- [x] `website/docs/intro.md` をHostSwitchの紹介ページに更新する
- [x] 不要なDocusaurusデフォルトのチュートリアルフォルダを削除する
- [x] `website/docusaurus.config.ts` の設定（タイトル、URL、言語など）をHostSwitch用に更新する

## フィードバック対応
- [x] ブログのURLを `https://blog.milkmaccya.com/` に変更する
- [x] Docusaurusのブログ機能を削除する (`blog: false` 及びフォルダ削除)
- [x] ロゴ設定を削除する
- [x] トップページ (`src/pages/index.tsx`) をHostSwitchの説明に修正する
- [x] トップページの機能紹介画像をHostSwitchに合わせたもの（unDraw風）に差し替える
- [x] サイト全体のカラーをネイビー基調に変更し、画像もネイビー系で再生成する
- [x] 不要なデフォルトファイル（画像、サンプルページなど）を削除する

## i18n対応 (New)
- [x] `docusaurus.config.ts` に英語 (`en`) 設定を追加する
- [x] 翻訳ファイルの保存場所 (`i18n/en/...`) を作成する
- [x] ドキュメント (`intro.md`, `hostswitch-tutorial.md`) の英語版を作成・翻訳する
- [x] トップページ (`index.tsx`) の翻訳を行う (JSONファイル or Translateコンポーネント)
- [x] 機能紹介 (`HomepageFeatures`) の翻訳を行う
- [x] サイドバーやNavbarのラベル翻訳設定を確認する
  - [x] `website/i18n/en/docusaurus-theme-classic/navbar.json` 作成
  - [x] `website/i18n/en/docusaurus-theme-classic/footer.json` 作成
