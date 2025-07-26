import { beforeEach, describe, expect, it } from 'vitest';
import { BackupManager } from '../BackupManager';
import { createTestMocks } from './setup';

describe('BackupManager', () => {
  let backupManager: BackupManager;
  let mocks: ReturnType<typeof createTestMocks>;

  beforeEach(() => {
    mocks = createTestMocks();
    backupManager = new BackupManager(mocks.mockFileSystem, mocks.config);
  });

  describe('backupHosts()', () => {
    it('hostsファイルのバックアップが成功する', () => {
      const hostsContent = 'test hosts content';
      mocks.mockFileSystem.setFile(mocks.config.hostsPath, hostsContent);

      const result = backupManager.backupHosts();

      expect(result).toBeDefined();
      expect(result).toContain(mocks.config.backupDir);
      expect(result).toContain('hosts_');

      const backupContent = mocks.mockFileSystem.getFile(result!);
      expect(backupContent).toBe(hostsContent);
    });

    it('タイムスタンプ付きのバックアップファイル名を生成', () => {
      mocks.mockFileSystem.setFile(mocks.config.hostsPath, 'content');

      const result = backupManager.backupHosts();

      expect(result).toBeDefined();
      expect(result).toMatch(/hosts_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z/);
    });

    it('hostsファイルが存在しない場合はundefinedを返す', () => {
      const result = backupManager.backupHosts();

      expect(result).toBeUndefined();
    });

    it('バックアップ作成に失敗した場合はundefinedを返す', () => {
      mocks.mockFileSystem.setFile(mocks.config.hostsPath, 'content');

      const error = new Error('Backup failed');
      mocks.mockFileSystem.setThrowErrorOnNext(error);

      const result = backupManager.backupHosts();

      expect(result).toBeUndefined();
    });

    it('コピー処理で例外が発生してもundefinedを返す', () => {
      mocks.mockFileSystem.setFile(mocks.config.hostsPath, 'content');

      const originalCopySync = mocks.mockFileSystem.copySync;
      mocks.mockFileSystem.copySync = () => {
        throw new Error('Copy failed');
      };

      const result = backupManager.backupHosts();

      expect(result).toBeUndefined();

      mocks.mockFileSystem.copySync = originalCopySync;
    });

    it('複数回呼び出すとファイルを作成する', () => {
      const hostsContent = 'test content';
      mocks.mockFileSystem.setFile(mocks.config.hostsPath, hostsContent);

      const backup1 = backupManager.backupHosts();
      const backup2 = backupManager.backupHosts();

      expect(backup1).toBeDefined();
      expect(backup2).toBeDefined();

      expect(mocks.mockFileSystem.getFile(backup1!)).toBe(hostsContent);
      expect(mocks.mockFileSystem.getFile(backup2!)).toBe(hostsContent);
    });

    it('バックアップディレクトリ内に正しくファイルが作成される', () => {
      mocks.mockFileSystem.setFile(mocks.config.hostsPath, 'content');

      const result = backupManager.backupHosts();

      expect(result).toBeDefined();
      expect(result?.startsWith(mocks.config.backupDir)).toBe(true);
      expect(mocks.mockFileSystem.existsSync(result!)).toBe(true);
    });
  });
});
