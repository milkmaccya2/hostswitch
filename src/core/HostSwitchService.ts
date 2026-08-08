import type {
  BackupInfo,
  CreateProfileResult,
  DnsFlushResult,
  HostSwitchConfig,
  IDnsCacheFlusher,
  IFileSystem,
  ILogger,
  ProfileInfo,
  RestoreResult,
  SwitchOptions,
  SwitchResult,
} from '../interfaces';
import { BackupManager } from './BackupManager';
import { CurrentProfileManager } from './CurrentProfileManager';
import { ProfileManager } from './ProfileManager';

export class HostSwitchService {
  private profileManager: ProfileManager;
  private currentProfileManager: CurrentProfileManager;
  private backupManager: BackupManager;

  constructor(
    private fileSystem: IFileSystem,
    private logger: ILogger,
    private config: HostSwitchConfig,
    private dnsCacheFlusher?: IDnsCacheFlusher
  ) {
    this.ensureDirs();
    this.profileManager = new ProfileManager(fileSystem, config);
    this.currentProfileManager = new CurrentProfileManager(fileSystem, config);
    this.backupManager = new BackupManager(fileSystem, config);
  }

  private ensureDirs(): void {
    this.fileSystem.ensureDirSync(this.config.configDir);
    this.fileSystem.ensureDirSync(this.config.profilesDir);
    this.fileSystem.ensureDirSync(this.config.backupDir);
  }

  getHostsPath(): string {
    return this.config.hostsPath;
  }

  isValidProfileName(name: string): boolean {
    return this.profileManager.isValidProfileName(name);
  }

  getCurrentProfile(): string | null {
    return this.currentProfileManager.getCurrentProfile();
  }

  getProfiles(): ProfileInfo[] {
    const currentProfile = this.getCurrentProfile();
    return this.profileManager.getProfiles(currentProfile);
  }

  getBackups(): BackupInfo[] {
    return this.backupManager.listBackups();
  }

  /**
   * バックアップから hosts を復元する。id を省略すると最新を使う。
   * switch と同じく、書き込みはアトミック置換で行い、書けない場合は
   * requiresSudo を返して呼び出し側に昇格させる。
   *
   * 復元した hosts は特定のプロファイルと一致するとは限らないので、
   * 復元後は current プロファイルを解除する。
   */
  restoreBackup(id?: string): RestoreResult {
    const backups = this.backupManager.listBackups();
    if (backups.length === 0) {
      return { success: false, message: 'No backups found.' };
    }

    const target = id ? backups.find((backup) => backup.id === id) : backups[0];
    if (!target) {
      return { success: false, message: `Backup '${id}' not found.` };
    }

    // 復元前の hosts も退避しておく。取れないなら進めない
    let backupPath: string | undefined;
    if (this.currentProfileManager.isHostsModified() || !this.getCurrentProfile()) {
      const backup = this.backupManager.backupHosts();
      if (!backup.success) {
        return {
          success: false,
          message: `Aborted: could not back up the current hosts file (${backup.message}).`,
        };
      }
      backupPath = backup.path;
    }

    try {
      this.replaceHostsFile(target.path);
      this.currentProfileManager.clearCurrentProfile();
      this.backupManager.pruneBackups();
      return {
        success: true,
        message: `Restored hosts from backup '${target.id}'.`,
        backupPath,
      };
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === 'EACCES') {
        return { success: false, message: 'Permission denied. Run with sudo.', requiresSudo: true };
      }
      return { success: false, message: `Error restoring backup: ${error.message}` };
    }
  }

  createProfile(name: string, fromCurrent: boolean = false): CreateProfileResult {
    return this.profileManager.createProfile(name, fromCurrent);
  }

  async switchProfile(name: string, options: SwitchOptions = {}): Promise<SwitchResult> {
    if (!this.profileManager.profileExists(name)) {
      return {
        success: false,
        message: `Profile '${name}' does not exist.`,
      };
    }

    // 昇格は CLI 層の責務。ここは書き込みを試み、権限が無ければ
    // requiresSudo を返して呼び出し側に判断させる
    return this.doSwitchProfile(name, options);
  }

  private async doSwitchProfile(name: string, options: SwitchOptions = {}): Promise<SwitchResult> {
    const currentProfile = this.getCurrentProfile();
    const isModified = this.currentProfileManager.isHostsModified();
    let backupPath: string | undefined;

    if (!currentProfile || isModified) {
      const backup = this.backupManager.backupHosts();
      if (!backup.success) {
        // バックアップは切り替え前の安全装置なので、取れないまま進めない
        return {
          success: false,
          message: `Aborted: could not back up the current hosts file (${backup.message}).`,
        };
      }
      backupPath = backup.path;
      if (isModified && currentProfile) {
        this.logger.warn('Current hosts file was modified outside of hostswitch.');
      }
    }

    try {
      const profilePath = this.profileManager.getProfilePath(name);
      this.replaceHostsFile(profilePath);
      this.currentProfileManager.setCurrentProfile(name);
      this.backupManager.pruneBackups();

      // hostsの書き換えが済んだ後に行う。フラッシュが失敗しても切り替えは成功
      const dnsFlush = await this.flushDnsCache(options);

      return {
        success: true,
        message: `Switched to profile '${name}'.`,
        backupPath,
        dnsFlush,
      };
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === 'EACCES') {
        return {
          success: false,
          message: 'Permission denied. Run with sudo.',
          requiresSudo: true,
        };
      } else {
        return {
          success: false,
          message: `Error switching profile: ${error.message}`,
        };
      }
    }
  }

  /**
   * DNSキャッシュのフラッシュを試みる。ベストエフォートなので、
   * 失敗しても切り替え自体は成功として扱い、警告だけ出す。
   */
  private async flushDnsCache(options: SwitchOptions): Promise<DnsFlushResult | undefined> {
    if (options.flushDns === false || !this.dnsCacheFlusher) {
      return undefined;
    }

    try {
      const result = await this.dnsCacheFlusher.flush();
      if (result.attempted && !result.success) {
        this.logger.warn(
          `Could not flush the DNS cache (${result.command}: ${result.message}). ` +
            'The switch itself succeeded; you may need to flush it manually.'
        );
      }
      return result;
    } catch (err) {
      const error = err as Error;
      this.logger.warn(`Could not flush the DNS cache (${error.message}).`);
      return { attempted: true, success: false, message: error.message };
    }
  }

  /**
   * hostsファイルを差し替える。
   *
   * 同じディレクトリに一時ファイルを作ってから rename で置き換える。
   * rename は同一ファイルシステム内でアトミックなので、途中で失敗しても
   * hostsファイルが中途半端な内容になることがない。
   */
  private replaceHostsFile(profilePath: string): void {
    const tempPath = `${this.config.hostsPath}.hostswitch-${process.pid}`;

    try {
      this.fileSystem.copySync(profilePath, tempPath);
      this.fileSystem.renameSync(tempPath, this.config.hostsPath);
    } catch (err) {
      try {
        this.fileSystem.unlinkSync(tempPath);
      } catch {
        // 後始末の失敗で本来のエラーを隠さない
      }
      throw err;
    }
  }

  deleteProfile(name: string): { success: boolean; message: string } {
    const currentProfile = this.getCurrentProfile();
    return this.profileManager.deleteProfile(name, currentProfile);
  }

  getProfileContent(name: string): { success: boolean; content?: string; message?: string } {
    return this.profileManager.getProfileContent(name);
  }

  profileExists(name: string): boolean {
    return this.profileManager.profileExists(name);
  }

  // プロファイルの内容が hosts ファイルに反映済みかどうか。
  // どちらかが読めないときは true を返し、適用を促さない。
  isProfileApplied(name: string): boolean {
    const profile = this.profileManager.getProfileContent(name);
    if (!profile.success || profile.content === undefined) {
      return true;
    }

    try {
      return this.fileSystem.readFileSync(this.config.hostsPath) === profile.content;
    } catch (_err) {
      return true;
    }
  }

  getProfilePath(name: string): string {
    return this.profileManager.getProfilePath(name);
  }
}
