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

  describe('listBackups()', () => {
    it('hosts_ で始まるファイルを新しい順に返す', () => {
      mocks.mockFileSystem.setFile(
        `${mocks.config.backupDir}/hosts_2026-08-05T14-32-10-123Z`,
        'old'
      );
      mocks.mockFileSystem.setFile(
        `${mocks.config.backupDir}/hosts_2026-08-07T09-15-00-000Z`,
        'new'
      );
      // バックアップではないファイルは無視する
      mocks.mockFileSystem.setFile(`${mocks.config.backupDir}/notes.txt`, 'x');

      const backups = backupManager.listBackups();

      expect(backups).toHaveLength(2);
      expect(backups[0].id).toBe('2026-08-07T09-15-00-000Z');
      expect(backups[1].id).toBe('2026-08-05T14-32-10-123Z');
    });

    it('ファイル名から作成日時を復元する', () => {
      mocks.mockFileSystem.setFile(`${mocks.config.backupDir}/hosts_2026-08-05T14-32-10-123Z`, 'x');

      const [backup] = backupManager.listBackups();

      expect(backup.createdAt).toEqual(new Date('2026-08-05T14:32:10.123Z'));
    });

    it('想定外の名前は createdAt を null にする', () => {
      mocks.mockFileSystem.setFile(`${mocks.config.backupDir}/hosts_manual-copy`, 'x');

      const [backup] = backupManager.listBackups();

      expect(backup.id).toBe('manual-copy');
      expect(backup.createdAt).toBeNull();
    });

    it('バックアップディレクトリが読めなくても空配列を返す', () => {
      const original = mocks.mockFileSystem.readdirSync;
      mocks.mockFileSystem.readdirSync = () => {
        throw new Error('ENOENT');
      };

      expect(backupManager.listBackups()).toEqual([]);

      mocks.mockFileSystem.readdirSync = original;
    });
  });

  describe('getBackup()', () => {
    it('id で1件取得する', () => {
      mocks.mockFileSystem.setFile(`${mocks.config.backupDir}/hosts_2026-08-05T14-32-10-123Z`, 'x');

      expect(backupManager.getBackup('2026-08-05T14-32-10-123Z')).toBeDefined();
      expect(backupManager.getBackup('nope')).toBeUndefined();
    });
  });

  describe('pruneBackups()', () => {
    it('直近 keep 件を残して古いものを消す', () => {
      for (const ts of [
        '2026-08-01T00-00-00-000Z',
        '2026-08-02T00-00-00-000Z',
        '2026-08-03T00-00-00-000Z',
        '2026-08-04T00-00-00-000Z',
      ]) {
        mocks.mockFileSystem.setFile(`${mocks.config.backupDir}/hosts_${ts}`, 'x');
      }

      backupManager.pruneBackups(2);

      const remaining = backupManager.listBackups().map((b) => b.id);
      expect(remaining).toEqual(['2026-08-04T00-00-00-000Z', '2026-08-03T00-00-00-000Z']);
    });

    it('件数が保持数以下なら何も消さない', () => {
      mocks.mockFileSystem.setFile(`${mocks.config.backupDir}/hosts_2026-08-01T00-00-00-000Z`, 'x');

      backupManager.pruneBackups(20);

      expect(backupManager.listBackups()).toHaveLength(1);
    });

    it('削除に失敗しても止まらない', () => {
      for (const ts of ['2026-08-01T00-00-00-000Z', '2026-08-02T00-00-00-000Z']) {
        mocks.mockFileSystem.setFile(`${mocks.config.backupDir}/hosts_${ts}`, 'x');
      }
      mocks.mockFileSystem.unlinkSync = () => {
        throw new Error('locked');
      };

      expect(() => backupManager.pruneBackups(1)).not.toThrow();
    });
  });
});
