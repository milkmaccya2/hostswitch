import type { HostSwitchConfig, IFileSystem } from '../interfaces';

export class BackupManager {
  constructor(
    private fileSystem: IFileSystem,
    private config: HostSwitchConfig
  ) {}

  backupHosts(): string | undefined {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${this.config.backupDir}/hosts_${timestamp}`;
    try {
      this.fileSystem.copySync(this.config.hostsPath, backupPath);
      return backupPath;
    } catch (err) {
      return undefined;
    }
  }
}
