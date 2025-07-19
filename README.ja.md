# HostSwitch

[![npm version](https://badge.fury.io/js/@milkmaccya2%2Fhostswitch.svg)](https://www.npmjs.com/package/@milkmaccya2/hostswitch)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

シンプルなhostsファイル切り替えCLIツール

[English](README.md)

## 概要

HostSwitchは、開発環境やテスト環境で異なるhosts設定を簡単に切り替えるためのCLIツールです。Gas MaskのようなGUIアプリとは異なり、コマンドラインから素早く操作できることを重視しています。

### こんな人におすすめ

- 👨‍💻 複数の開発環境を切り替えるWeb開発者
- 🔧 ローカル、ステージング、本番環境のテストが必要なエンジニア
- 🏢 複数のサーバー環境を管理するシステム管理者
- 🚀 CLIでの素早い操作を好む人

## 主な機能

- ✅ **複数のhostsプロファイル管理** - 開発、ステージング、本番用など
- 💾 **自動バックアップ** - 切り替え前に現在のhostsを保存
- 🎨 **カラフルな出力** - 状態が一目でわかる
- ⚡ **シンプルなCLI** - 覚えやすいコマンド
- 🔒 **安全な操作** - sudo権限が必要な操作を明示

## 要件

- Node.js 20.0.0以上
- macOS / Linux / Windows (WSL推奨)
- sudo権限（hostsファイル切り替え時）

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

# TypeScriptのビルド
npm run build

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

## よくある使用例

### 開発環境のセットアップ

```bash
# ローカル開発用
hostswitch create local
hostswitch edit local
# 127.0.0.1 api.myapp.local
# 127.0.0.1 app.myapp.local

# Docker環境用
hostswitch create docker
hostswitch edit docker
# 172.17.0.2 api.myapp.docker
# 172.17.0.3 db.myapp.docker

# 切り替え
sudo hostswitch switch local
```

### チーム開発での活用

```bash
# チームメンバーの環境を参照
hostswitch create team-dev --from-current

# 自分の環境に戻す
sudo hostswitch switch local
```

### 本番環境のテスト

```bash
# 本番環境を指すhostsを作成
hostswitch create production
hostswitch edit production
# 192.168.1.100 api.myapp.com
# 192.168.1.101 app.myapp.com

# テスト実施
sudo hostswitch switch production
# テスト完了後
sudo hostswitch switch local
```

## 開発

### ソースからのビルド
```bash
# 依存関係のインストール
npm install

# TypeScriptのビルド
npm run build

# 開発用のウォッチモード
npm run build:watch

# 開発モードで実行
npm run dev -- list
```

### プロジェクト構造
```
hostswitch/
├── src/
│   └── hostswitch.ts    # TypeScriptソースコード
├── dist/                # コンパイル済みJavaScript（自動生成）
├── tsconfig.json        # TypeScript設定
└── package.json
```

## トラブルシューティング

### sudo権限が必要な理由

`/etc/hosts`ファイルはroot所有のシステムファイルのため、変更には管理者権限が必要です。

```bash
# ✅ 正しい使い方
sudo hostswitch switch dev

# ❌ エラーになる
hostswitch switch dev  # Permission denied
```

### プロファイルが見つからない場合

```bash
# プロファイル一覧を確認
hostswitch list

# プロファイル名のタイポを確認
hostswitch show <tab>  # bash補完が使える場合
```

### Windowsでの使用

WindowsではWSL (Windows Subsystem for Linux)の使用を推奨します。ネイティブWindowsで使用する場合は、管理者権限でコマンドプロンプトを実行してください。

**注意**: ネイティブWindowsサポートが改善されました。WindowsのhostsファイルパスC:\Windows\System32\drivers\etc\hosts）を自動的に検出します。

## データ保存場所

- プロファイル: `~/.hostswitch/profiles/`
- バックアップ: `~/.hostswitch/backups/`
- 現在のプロファイル情報: `~/.hostswitch/current.json`

## ライセンス

MIT License - 詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 作者

[milkmaccya2](https://github.com/milkmaccya2)

## 貢献

バグ報告や機能追加のリクエストは[GitHub Issues](https://github.com/milkmaccya2/hostswitch/issues)で受け付けています。