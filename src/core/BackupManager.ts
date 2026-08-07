import * as path from 'node:path';
import type { BackupResult, HostSwitchConfig, IFileSystem } from '../interfaces';

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
    const backupPath = path.join(this.config.backupDir, `hosts_${timestamp}`);

    try {
      this.fileSystem.copySync(this.config.hostsPath, backupPath);
      return { success: true, path: backupPath };
    } catch (err) {
      return { success: false, message: (err as Error).message };
    }
  }
}
