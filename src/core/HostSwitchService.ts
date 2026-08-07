import type {
  CreateProfileResult,
  HostSwitchConfig,
  IFileSystem,
  ILogger,
  IPermissionChecker,
  ProfileInfo,
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
    private permissionChecker: IPermissionChecker
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

  createProfile(name: string, fromCurrent: boolean = false): CreateProfileResult {
    return this.profileManager.createProfile(name, fromCurrent);
  }

  async switchProfile(name: string): Promise<SwitchResult> {
    if (!this.profileManager.profileExists(name)) {
      return {
        success: false,
        message: `Profile '${name}' does not exist.`,
      };
    }

    // 権限チェック - sudo必要かつsudoで実行されていない場合は自動sudo実行
    const needsSudo = await this.permissionChecker.requiresSudo(this.config.hostsPath);
    if (needsSudo) {
      this.logger.info('Requesting administrative access...');
      const sudoResult = await this.permissionChecker.rerunWithSudo(['switch', name]);
      return {
        success: sudoResult.success,
        message: sudoResult.message,
        requiresSudo: true,
      };
    }

    return this.doSwitchProfile(name);
  }

  private doSwitchProfile(name: string): SwitchResult {
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
      return {
        success: true,
        message: `Switched to profile '${name}'.`,
        backupPath,
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

  getProfilePath(name: string): string {
    return this.profileManager.getProfilePath(name);
  }
}
