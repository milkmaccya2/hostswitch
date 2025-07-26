import { HostSwitchService } from '../core/HostSwitchService';
import { IProcessManager, IPermissionChecker, ICommandResult, ProfileInfo } from '../interfaces';

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

  async switchProfile(name: string): Promise<ICommandResult> {
    try {
      if (!this.hostSwitchService.profileExists(name)) {
        return {
          success: false,
          message: `Profile "${name}" does not exist`,
        };
      }

      if (this.permissionChecker.requiresSudo()) {
        return {
          success: false,
          requiresSudo: true,
          sudoCommand: `sudo hostswitch switch ${name}`,
          message: 'This operation requires sudo privileges',
        };
      }

      const result = await this.hostSwitchService.switchProfile(name);
      if (result.success) {
        let message = `Switched to profile "${name}"`;
        if (result.backupPath) {
          message += ' (backup created)';
        }
        return {
          success: true,
          message,
          data: { switchResult: result },
        };
      } else {
        return {
          success: false,
          message: result.message || 'Failed to switch profile',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to switch profile: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async switchProfileWithSudo(name: string): Promise<ICommandResult> {
    try {
      const result = await this.permissionChecker.rerunWithSudo(['switch', name]);
      if (result.success) {
        return {
          success: true,
          message: result.message || 'Switched successfully',
        };
      } else {
        return {
          success: false,
          message: `Failed to switch profile: ${result.message || 'Unknown error'}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to switch profile: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async deleteProfile(name: string): Promise<ICommandResult> {
    const validation = this.validateProfileName(name);
    if (!validation.success) {
      return validation;
    }

    try {
      const result = this.hostSwitchService.deleteProfile(name);
      if (result.success) {
        return {
          success: true,
          message: `Profile "${name}" deleted successfully`,
          requiresConfirmation: true,
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
    try {
      if (!this.hostSwitchService.profileExists(name)) {
        return {
          success: false,
          message: `Profile "${name}" does not exist`,
        };
      }

      const profilePath = this.hostSwitchService.getProfilePath(name);
      await this.processManager.openEditor('vi', profilePath);
      
      return {
        success: true,
        message: `Profile "${name}" edited successfully`,
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
    return profiles.filter(p => !p.isCurrent);
  }

  private validateProfileName(name: string): ICommandResult {
    if (!name || name.trim() === '') {
      return {
        success: false,
        message: 'Profile name cannot be empty',
      };
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return {
        success: false,
        message: 'Invalid profile name. Use only letters, numbers, hyphens, and underscores',
      };
    }

    return { success: true };
  }
}