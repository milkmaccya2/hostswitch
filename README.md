# HostSwitch

シンプルなhostsファイル切り替えCLIツール（Node.js版）

## インストール

```bash
# 依存関係のインストール
npm install

# グローバルインストール（オプション）
npm link
```

## 使い方

### プロファイル一覧を表示
```bash
./hostswitch.js list
# または
./hostswitch.js ls
```

### プロファイルを作成
```bash
# デフォルト内容で作成
./hostswitch.js create development

# 現在のhostsファイルから作成
./hostswitch.js create production --from-current
```

### プロファイルを切り替え（要sudo）
```bash
sudo ./hostswitch.js switch development
# または
sudo ./hostswitch.js use development
```

### プロファイルの内容を表示
```bash
./hostswitch.js show development
# または
./hostswitch.js cat development
```

### プロファイルを編集
```bash
./hostswitch.js edit development
```

### プロファイルを削除
```bash
./hostswitch.js delete development
# または
./hostswitch.js rm development
```

## データ保存場所

- プロファイル: `~/.hostswitch/profiles/`
- バックアップ: `~/.hostswitch/backups/`
- 現在のプロファイル情報: `~/.hostswitch/current.json`