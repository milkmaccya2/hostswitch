/// <reference types="vitest" />
import { defineConfig } from 'vite';

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
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        // 型定義のみで実行コードがない
        'src/interfaces/**',
        // テスト用モック
        'src/__mocks__/**',
        // 依存の組み立て（結線）のみ。E2E でしか意味のあるカバレッジにならない
        'src/hostswitch.ts',
      ],
      // 現状値（lines/statements 83%, branches 84%, functions 91%）から
      // 少し下に置く。ここを割ったら CI が落ちる
      thresholds: {
        lines: 85,
        statements: 85,
        branches: 82,
        functions: 90,
      },
    },
  },
});
