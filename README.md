# HostSwitch

[![npm version](https://badge.fury.io/js/@milkmaccya2%2Fhostswitch.svg)](https://www.npmjs.com/package/@milkmaccya2/hostswitch)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

シンプルなhostsファイル切り替えCLIツール（Node.js版）

## インストール

### npmからインストール（推奨）
```bash
# グローバルインストール
npm install -g @milkmaccya2/hostswitch

# またはnpxで直接実行
npx @milkmaccya2/hostswitch list
```

### ソースからインストール
```bash
# リポジトリをクローン
git clone https://github.com/milkmaccya2/hostswitch.git
cd hostswitch

# 依存関係のインストール
npm install

# グローバルインストール（オプション）
npm link
```

## 使い方

### プロファイル一覧を表示
```bash
hostswitch list
# または
hostswitch ls
```

### プロファイルを作成
```bash
# デフォルト内容で作成
hostswitch create development

# 現在のhostsファイルから作成
hostswitch create production --from-current
```

### プロファイルを切り替え（要sudo）
```bash
sudo hostswitch switch development
# または
sudo hostswitch use development
```

### プロファイルの内容を表示
```bash
hostswitch show development
# または
hostswitch cat development
```

### プロファイルを編集
```bash
hostswitch edit development
```

### プロファイルを削除
```bash
hostswitch delete development
# または
hostswitch rm development
```

## データ保存場所

- プロファイル: `~/.hostswitch/profiles/`
- バックアップ: `~/.hostswitch/backups/`
- 現在のプロファイル情報: `~/.hostswitch/current.json`