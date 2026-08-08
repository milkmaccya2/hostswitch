import type { HostSwitchService } from '../core/HostSwitchService';
import { INVALID_PROFILE_NAME_MESSAGE } from '../core/ProfileManager';
import type {
  ICommandResult,
  IPermissionChecker,
  IProcessManager,
  ProfileInfo,
  SwitchOptions,
} from '../interfaces';

export class HostSwitchFacade {
  constructor(
    private hostSwitchService: HostSwitchService,
    private processManager: IProcessManager,
    private permissionChecker: IPermissionChecker
  ) {}

  async listProfiles(): Promise<ICommandResult> {
    try {
      const profiles = this.hostSwitchService.getProfiles();
      return {
        success: true,
        data: { profiles },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to list profiles: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async createProfile(name: string, fromCurrent: boolean): Promise<ICommandResult> {
    const validation = this.validateProfileName(name);
    if (!validation.success) {
      return validation;
    }

    try {
      const result = this.hostSwitchService.createProfile(name, fromCurrent);
      if (result.success) {
        return {
          success: true,
          message: `Profile "${name}" created successfully`,
        };
      } else {
        return {
          success: false,
          message: result.message || 'Failed to create profile',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to create profile: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async getStatus(): Promise<ICommandResult> {
    try {
      const status = this.hostSwitchService.getStatus();
      return { success: true, data: { status } };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get status: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async listBackups(): Promise<ICommandResult> {
    try {
      const backups = this.hostSwitchService.getBackups();
      return {
        success: true,
        data: { backups },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to list backups: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async restoreBackup(id?: string): Promise<ICommandResult> {
    try {
      const backups = this.hostSwitchService.getBackups();
      if (backups.length === 0) {
        return { success: false, message: 'No backups found' };
      }
      if (id && !backups.some((backup) => backup.id === id)) {
        return { success: false, message: `Backup "${id}" not found` };
      }

      const args = id ? ['restore', id] : ['restore'];

      // switch と同じく、書き込みには sudo が要る
      if (this.permissionChecker.requiresSudo(this.hostSwitchService.getHostsPath())) {
        return this.needsSudoResult(args);
      }

      const result = this.hostSwitchService.restoreBackup(id);
      if (result.success) {
        let message = result.message ?? 'Restored from backup';
        if (result.backupPath) {
          message += ' (previous hosts backed up)';
        }
        return { success: true, message };
      }
      // 事前の requiresSudo チェックは通ったが、実際の書き込みで権限が
      // 足りなかった場合。ここでも昇格に必要な情報を渡す
      if (result.requiresSudo) {
        return this.needsSudoResult(args);
      }
      return {
        success: false,
        message: result.message || 'Failed to restore backup',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to restore backup: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async switchProfile(name: string, options: SwitchOptions = {}): Promise<ICommandResult> {
    const validation = this.validateProfileName(name);
    if (!validation.success) {
      return validation;
    }

    try {
      if (!this.hostSwitchService.profileExists(name)) {
        return {
          success: false,
          message: `Profile "${name}" does not exist`,
        };
      }

      if (this.permissionChecker.requiresSudo(this.hostSwitchService.getHostsPath())) {
        return this.needsSudoResult(['switch', name]);
      }

      const result = await this.hostSwitchService.switchProfile(name, options);
      if (result.success) {
        let message = `Switched to profile "${name}"`;
        if (result.backupPath) {
          message += ' (backup created)';
        }
        if (result.dnsFlush?.attempted && result.dnsFlush.success) {
          message += ' (DNS cache flushed)';
        }
        return {
          success: true,
          message,
          data: { switchResult: result },
        };
      }
      // 事前チェックは通ったが実際の書き込みで権限が足りなかった場合
      if (result.requiresSudo) {
        return this.needsSudoResult(['switch', name]);
      }
      return {
        success: false,
        message: result.message || 'Failed to switch profile',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to switch profile: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * sudo で自分自身を再実行する。UI 層はこれだけを使い、
   * 自前で子プロセスを起動しない。
   */
  async elevate(args: string[]): Promise<ICommandResult> {
    try {
      const result = await this.permissionChecker.rerunWithSudo(args);
      if (result.success) {
        return {
          success: true,
          message: result.message || 'Completed successfully',
        };
      } else {
        return {
          success: false,
          message: `Failed to run with sudo: ${result.message || 'Unknown error'}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to run with sudo: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async deleteProfile(name: string, force: boolean = false): Promise<ICommandResult> {
    const validation = this.validateProfileName(name);
    if (!validation.success) {
      return validation;
    }

    if (!force) {
      return {
        success: false,
        message:
          'This operation requires confirmation. Add --force flag to proceed without confirmation.',
        requiresConfirmation: true,
      };
    }

    try {
      const result = this.hostSwitchService.deleteProfile(name);
      if (result.success) {
        return {
          success: true,
          message: `Profile "${name}" deleted successfully`,
        };
      } else {
        return {
          success: false,
          message: result.message || 'Failed to delete profile',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete profile: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async showProfile(name: string): Promise<ICommandResult> {
    const validation = this.validateProfileName(name);
    if (!validation.success) {
      return validation;
    }

    try {
      const result = this.hostSwitchService.getProfileContent(name);
      if (result.success) {
        return {
          success: true,
          data: { content: result.content },
        };
      } else {
        return {
          success: false,
          message: result.message || 'Failed to get profile content',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to show profile: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async editProfile(name: string): Promise<ICommandResult> {
    const validation = this.validateProfileName(name);
    if (!validation.success) {
      return validation;
    }

    try {
      if (!this.hostSwitchService.profileExists(name)) {
        return {
          success: false,
          message: `Profile "${name}" does not exist`,
        };
      }

      const profilePath = this.hostSwitchService.getProfilePath(name);
      const isCurrent = this.hostSwitchService.getCurrentProfile() === name;
      const editor = process.env.EDITOR || 'vi';
      await this.processManager.openEditor(editor, profilePath);

      // 編集しただけでは hosts ファイルは変わらないため、current の編集は適用が必要になる
      const requiresApply = isCurrent && !this.hostSwitchService.isProfileApplied(name);

      return {
        success: true,
        message: `Profile "${name}" edited successfully`,
        requiresApply,
        profileName: name,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to edit profile: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  getCurrentProfile(): string | null {
    return this.hostSwitchService.getCurrentProfile();
  }

  getDeletableProfiles(): ProfileInfo[] {
    const profiles = this.hostSwitchService.getProfiles();
    return profiles.filter((p) => !p.isCurrent);
  }

  /**
   * inquirer の validate に渡せる形。判定そのものは core が持つ。
   */
  validateProfileNameInput(input: string): boolean | string {
    if (!input || input.trim() === '') {
      return 'Profile name cannot be empty';
    }
    return this.hostSwitchService.isValidProfileName(input) ? true : INVALID_PROFILE_NAME_MESSAGE;
  }

  /** 昇格が必要なときに UI へ返す結果。sudoArgs は elevate にそのまま渡る */
  private needsSudoResult(args: string[]): ICommandResult {
    return {
      success: false,
      requiresSudo: true,
      sudoCommand: `sudo hostswitch ${args.join(' ')}`,
      sudoArgs: args,
      message: 'This operation requires sudo privileges',
    };
  }

  private validateProfileName(name: string): ICommandResult {
    const result = this.validateProfileNameInput(name);
    return typeof result === 'string' ? { success: false, message: result } : { success: true };
  }
}
