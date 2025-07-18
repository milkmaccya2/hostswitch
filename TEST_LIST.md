# HostSwitchService テストリスト

## 📝 t-wada流：テストすべきシナリオ一覧

### getCurrentProfile()
- [ ] 1. プロファイルが設定されていない場合はnullを返す
- [ ] 2. プロファイルが設定されている場合は名前を返す
- [ ] 3. current.jsonが壊れている場合はnullを返す

### getProfiles()  
- [ ] 4. プロファイルが0個の場合は空配列を返す
- [ ] 5. プロファイルが複数ある場合は全て返す
- [ ] 6. 現在のプロファイルにisCurrent=trueが付く
- [ ] 7. .hostsファイル以外は無視される

### createProfile()
- [ ] 8. 新規プロファイル作成が成功する（デフォルト内容）
- [ ] 9. 新規プロファイル作成が成功する（現在のhostsから）
- [ ] 10. 既存プロファイル名だとエラーを返す
- [ ] 11. ファイル書き込みエラー時にエラーを返す

### switchProfile()
- [ ] 12. 存在するプロファイルに切り替え成功
- [ ] 13. 存在しないプロファイルだとエラー
- [ ] 14. 初回切り替えでバックアップが作成される
- [ ] 15. hosts変更検出時にバックアップが作成される
- [ ] 16. ファイル権限エラー時にEACCESエラー
- [ ] 17. 切り替え後にcurrent.jsonが更新される

### deleteProfile()
- [ ] 18. 存在するプロファイルの削除が成功
- [ ] 19. 存在しないプロファイルだとエラー
- [ ] 20. 現在アクティブなプロファイルは削除できない

### profileExists()
- [ ] 21. 存在するプロファイルでtrue
- [ ] 22. 存在しないプロファイルでfalse

## 🎯 実装順序（t-wada推奨：簡単なものから）
1. ✅ テスト環境構築
2. → getCurrentProfile() の基本テスト
3. → getProfiles() の基本テスト  
4. → createProfile() の基本テスト
5. → 複雑なケース（エラー処理など）