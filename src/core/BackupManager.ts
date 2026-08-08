import * as path from 'node:path';
import type { BackupInfo, BackupResult, HostSwitchConfig, IFileSystem } from '../interfaces';

const BACKUP_PREFIX = 'hosts_';

/** 直近この件数を残し、それより古いバックアップは switch のたびに削除する */
export const DEFAULT_BACKUP_RETENTION = 20;

export class BackupManager {
  constructor(
    private fileSystem: IFileSystem,
    private config: HostSwitchConfig
  ) {}

  /**
   * hostsファイルを退避する。
   *
   * hostsファイルが存在しない場合は「退避するものが無い」ので成功として扱い、
   * 退避すべき内容があるのに失敗した場合だけ失敗を返す。呼び出し側はこれを
   * 区別して、後者では切り替えを中断できる。
   */
  backupHosts(): BackupResult {
    if (!this.fileSystem.existsSync(this.config.hostsPath)) {
      return { success: true, skipped: true };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.config.backupDir, `${BACKUP_PREFIX}${timestamp}`);

    try {
      this.fileSystem.copySync(this.config.hostsPath, backupPath);
      return { success: true, path: backupPath };
    } catch (err) {
      return { success: false, message: (err as Error).message };
    }
  }

  /**
   * バックアップを新しい順に返す。ファイル名のタイムスタンプは辞書順が
   * そのまま時系列順になるので、名前でソートするだけでよい。
   */
  listBackups(): BackupInfo[] {
    let files: string[];
    try {
      files = this.fileSystem.readdirSync(this.config.backupDir);
    } catch {
      return [];
    }

    return files
      .filter((file) => file.startsWith(BACKUP_PREFIX))
      .sort()
      .reverse()
      .map((file) => {
        const id = file.slice(BACKUP_PREFIX.length);
        return {
          id,
          path: path.join(this.config.backupDir, file),
          createdAt: parseBackupTimestamp(id),
        };
      });
  }

  getBackup(id: string): BackupInfo | undefined {
    return this.listBackups().find((backup) => backup.id === id);
  }

  /**
   * 直近 keep 件を残して古いものを削除する。ベストエフォートで、
   * 個々の削除に失敗しても止めない（バックアップ本体の処理を妨げない）。
   */
  pruneBackups(keep: number = DEFAULT_BACKUP_RETENTION): void {
    if (keep < 0) {
      return;
    }
    const stale = this.listBackups().slice(keep);
    for (const backup of stale) {
      try {
        this.fileSystem.unlinkSync(backup.path);
      } catch {
        // 消せなくても致命的ではない
      }
    }
  }
}

/**
 * `2026-08-05T14-32-10-123Z` を Date に戻す。時刻区切りの `-` を元の
 * `:` と `.` に戻してから解釈する。想定外の形式なら null。
 */
function parseBackupTimestamp(id: string): Date | null {
  const match = id.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/);
  if (!match) {
    return null;
  }
  const [, date, h, m, s, ms] = match;
  const parsed = new Date(`${date}T${h}:${m}:${s}.${ms}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
