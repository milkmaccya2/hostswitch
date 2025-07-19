/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    // テストファイルのパターン
    include: ['**/*.test.ts', '**/*.spec.ts'],
    // テスト環境の設定
    environment: 'node',
    // グローバルAPI（describe, it, expect）を自動インポート
    globals: true,
    // テストファイルの監視設定
    watch: false,
    // カバレッジ設定
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts']
    }
  }
})