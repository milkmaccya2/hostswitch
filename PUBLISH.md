# NPMパッケージとして公開する手順

## 1. 準備

### package.jsonの更新
- `name`: ユニークな名前に変更（例: `@milkmaccya2/hostswitch`）
- `author`: あなたの名前とメールアドレス
- `repository`: GitHubリポジトリのURL

### npmアカウントの作成
```bash
# npmアカウントがない場合
npm adduser
```

## 2. パッケージ名の確認
```bash
# 名前が使用可能か確認
npm view @milkmaccya2/hostswitch
```

## 3. ローカルテスト
```bash
# グローバルインストールのテスト
npm link

# 動作確認
hostswitch list

# リンク解除
npm unlink
```

## 4. 公開
```bash
# npmにログイン
npm login

# 公開（初回）
npm publish --access public
```

## 5. 使用方法

### グローバルインストール
```bash
npm install -g @milkmaccya2/hostswitch
hostswitch list
```

### npxで実行
```bash
npx @milkmaccya2/hostswitch list
```

## 6. アップデート

### バージョン更新
```bash
# パッチバージョン (1.0.0 -> 1.0.1)
npm version patch

# マイナーバージョン (1.0.0 -> 1.1.0)
npm version minor

# メジャーバージョン (1.0.0 -> 2.0.0)
npm version major
```

### 再公開
```bash
npm publish
```

## 注意事項

1. **パッケージ名**: 
   - 既存のパッケージと重複しない名前を選ぶ
   - スコープ付き（`@username/package`）がおすすめ

2. **セキュリティ**:
   - `.npmignore`で不要なファイルを除外
   - 個人情報が含まれていないか確認

3. **テスト**:
   - 公開前に`npm pack`でパッケージ内容を確認
   - `npm pack --dry-run`で含まれるファイルをプレビュー