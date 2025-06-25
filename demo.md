# デモGIF作成ガイド

README.mdにGIFアニメーションを追加すると、ツールの使い方が視覚的にわかりやすくなります。

## 推奨される録画ツール

### macOS
- [Kap](https://getkap.co/) - 無料でシンプル
- [Gifox](https://gifox.io/) - 有料だが高機能
- QuickTime + ffmpeg

### 録画内容の例

```bash
# 1. インストール
npm install -g @milkmaccya2/hostswitch

# 2. プロファイル一覧（最初は空）
hostswitch list

# 3. 開発環境用プロファイル作成
hostswitch create dev
hostswitch edit dev

# 4. 本番環境用プロファイル作成
hostswitch create prod

# 5. プロファイル一覧（2つ表示）
hostswitch list

# 6. プロファイル切り替え
sudo hostswitch switch dev

# 7. 現在のプロファイル確認
hostswitch list
```

## GIFの仕様
- サイズ: 800x400px程度
- FPS: 10-15fps
- 長さ: 30秒以内
- ファイルサイズ: 2MB以下

## README.mdへの追加方法

```markdown
## デモ

![HostSwitch Demo](./demo.gif)
```

または、GitHubのissueにGIFをアップロードしてURLを使用：

```markdown
## デモ

![HostSwitch Demo](https://user-images.githubusercontent.com/xxx/xxx.gif)
```