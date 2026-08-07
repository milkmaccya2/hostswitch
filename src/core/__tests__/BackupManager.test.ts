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

      expect(result.success).toBe(true);
      expect(result.path).toContain(mocks.config.backupDir);
      expect(result.path).toContain('hosts_');
      expect(mocks.mockFileSystem.getFile(result.path!)).toBe(hostsContent);
    });

    it('タイムスタンプ付きのバックアップファイル名を生成', () => {
      mocks.mockFileSystem.setFile(mocks.config.hostsPath, 'content');

      const result = backupManager.backupHosts();

      expect(result.path).toMatch(/hosts_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z/);
    });

    it('hostsファイルが存在しない場合は skipped として成功を返す', () => {
      const result = backupManager.backupHosts();

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.path).toBeUndefined();
    });

    it('退避すべき内容があるのに失敗した場合は success=false を返す', () => {
      mocks.mockFileSystem.setFile(mocks.config.hostsPath, 'content');
      mocks.mockFileSystem.setThrowErrorOnNext(new Error('Backup failed'));

      const result = backupManager.backupHosts();

      expect(result.success).toBe(false);
      expect(result.skipped).toBeUndefined();
      expect(result.message).toContain('Backup failed');
    });

    it('コピー処理で例外が発生した場合も失敗理由を返す', () => {
      mocks.mockFileSystem.setFile(mocks.config.hostsPath, 'content');

      const originalCopySync = mocks.mockFileSystem.copySync;
      mocks.mockFileSystem.copySync = () => {
        throw new Error('Copy failed');
      };

      const result = backupManager.backupHosts();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Copy failed');

      mocks.mockFileSystem.copySync = originalCopySync;
    });

    it('複数回呼び出すとそれぞれファイルを作成する', () => {
      const hostsContent = 'test content';
      mocks.mockFileSystem.setFile(mocks.config.hostsPath, hostsContent);

      const backup1 = backupManager.backupHosts();
      const backup2 = backupManager.backupHosts();

      expect(backup1.success).toBe(true);
      expect(backup2.success).toBe(true);
      expect(mocks.mockFileSystem.getFile(backup1.path!)).toBe(hostsContent);
      expect(mocks.mockFileSystem.getFile(backup2.path!)).toBe(hostsContent);
    });

    it('バックアップディレクトリ内に正しくファイルが作成される', () => {
      mocks.mockFileSystem.setFile(mocks.config.hostsPath, 'content');

      const result = backupManager.backupHosts();

      expect(result.path?.startsWith(mocks.config.backupDir)).toBe(true);
      expect(mocks.mockFileSystem.existsSync(result.path!)).toBe(true);
    });
  });
});
