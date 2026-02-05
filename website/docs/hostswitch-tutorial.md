---
sidebar_position: 2
---

# HostSwitch チュートリアル

HostSwitchは、開発環境やテスト環境で異なるhosts設定を簡単に切り替えるためのCLIツールです。
このチュートリアルでは、HostSwitchのインストールから基本的な使い方、実際の活用シナリオまでを解説します。

## 1. インストール

まずはHostSwitchをインストールしましょう。Node.js (v20.0.0以上)が必要です。

### npmを使用したインストール（推奨）

```bash
npm install -g @milkmaccya2/hostswitch
```

または、インストールせずに`npx`で直接実行することも可能です。

```bash
npx @milkmaccya2/hostswitch list
```

## 2. 基本的な使い方

HostSwitchには、対話形式モードとコマンドライン引数モードの2つの使い方があります。

### 対話形式モード

引数なしで`hostswitch`を実行すると、対話形式モードが起動します。矢印キーで操作できるため、コマンドを覚える必要がありません。

```bash
hostswitch
```

画面に従って、「プロファイルの切り替え」「一覧表示」「作成」「編集」「削除」が行えます。

### コマンドラインでの操作

スクリプトや慣れている方向けに、コマンドライン引数でも操作可能です。

#### プロファイル一覧の表示

```bash
hostswitch list
```

#### プロファイルの作成

新しいプロファイルを作成します。

```bash
# 空のプロファイルを作成
hostswitch create development

# 現在のhostsファイルの内容をコピーして作成
hostswitch create production --from-current
```

#### プロファイルの編集

作成したプロファイルをエディタで編集します。

```bash
hostswitch edit development
```

#### プロファイルの切り替え

作成したプロファイルにhostsを切り替えます。sudo権限が必要な場合は自動的に求められます。

```bash
hostswitch switch development
```

## 3. 実践シナリオ

開発フローにおけるHostSwitchの活用例を紹介します。

### シナリオA: ローカル開発環境と本番環境の切り替え

Web開発では、ローカルのサーバー（localhost）と本番サーバーを行き来することがよくあります。

1.  **ローカル用プロファイルの作成**
    ```bash
    hostswitch create local
    hostswitch edit local
    ```
    中身に以下を記述:
    ```
    127.0.0.1 api.myapp.com
    127.0.0.1 app.myapp.com
    ```

2.  **本番用プロファイルの作成**
    ```bash
    hostswitch create production
    hostswitch edit production
    ```
    中身に以下を記述（実際の本番IP）:
    ```
    203.0.113.1 api.myapp.com
    203.0.113.2 app.myapp.com
    ```

3.  **環境の切り替え**
    開発中は `local` に切り替え:
    ```bash
    hostswitch switch local
    ```
    
    本番の動作確認時は `production` に切り替え:
    ```bash
    hostswitch switch production
    ```

### シナリオB: チームでの設定共有

チームメンバーと同じhosts設定を使いたい場合、一度プロファイルを作成し、その設定内容を共有することができます。

```bash
# チーム共通設定を作成
hostswitch create team-env
hostswitch edit team-env
# (共有された設定を貼り付け)
```

## トラブルシューティング

### 権限エラーが出る場合
HostSwitchは自動的にsudo権限を要求しますが、うまくいかない場合は手動でsudoをつけて実行してください。
```bash
sudo hostswitch switch development
```

### Windowsユーザーの方へ
WSL (Windows Subsystem for Linux) での使用を推奨していますが、コマンドプロンプトやPowerShellを「管理者として実行」することでも利用可能です。
