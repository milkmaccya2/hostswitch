import * as path from 'node:path';
import type {
  CreateProfileResult,
  HostSwitchConfig,
  IFileSystem,
  ProfileInfo,
} from '../interfaces';

const PROFILE_EXT = '.hosts';

/**
 * プロファイル名として許可する文字。ここがアプリ全体で唯一の定義。
 * パス区切り文字とドットを弾くことで、プロファイルディレクトリ外への
 * 参照を成立させない。
 */
const PROFILE_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

export const INVALID_PROFILE_NAME_MESSAGE =
  'Invalid profile name. Use only letters, numbers, hyphens, and underscores';

export class InvalidProfileNameError extends Error {
  constructor(name: string) {
    super(`${INVALID_PROFILE_NAME_MESSAGE} (got '${name}').`);
    this.name = 'InvalidProfileNameError';
  }
}

export class ProfileManager {
  constructor(
    private fileSystem: IFileSystem,
    private config: HostSwitchConfig
  ) {}

  isValidProfileName(name: string): boolean {
    return typeof name === 'string' && PROFILE_NAME_PATTERN.test(name);
  }

  getProfiles(currentProfile: string | null): ProfileInfo[] {
    const profiles = this.fileSystem
      .readdirSync(this.config.profilesDir)
      .filter((file) => file.endsWith(PROFILE_EXT))
      .map((file) => file.slice(0, -PROFILE_EXT.length));

    return profiles.map((name) => ({
      name,
      isCurrent: name === currentProfile,
    }));
  }

  createProfile(name: string, fromCurrent: boolean = false): CreateProfileResult {
    if (!this.isValidProfileName(name)) {
      return { success: false, message: INVALID_PROFILE_NAME_MESSAGE };
    }

    const profilePath = this.getProfilePath(name);

    if (this.fileSystem.existsSync(profilePath)) {
      return {
        success: false,
        message: `Profile '${name}' already exists.`,
      };
    }

    try {
      if (fromCurrent) {
        this.fileSystem.copySync(this.config.hostsPath, profilePath);
        return {
          success: true,
          message: `Profile '${name}' created from current hosts file.`,
        };
      } else {
        const defaultContent = this.getDefaultHostsContent();
        this.fileSystem.writeFileSync(profilePath, defaultContent);
        return {
          success: true,
          message: `Profile '${name}' created with default content.`,
        };
      }
    } catch (err) {
      const error = err as Error;
      return {
        success: false,
        message: `Error creating profile: ${error.message}`,
      };
    }
  }

  deleteProfile(
    name: string,
    currentProfile: string | null
  ): { success: boolean; message: string } {
    if (!this.isValidProfileName(name)) {
      return { success: false, message: INVALID_PROFILE_NAME_MESSAGE };
    }

    const profilePath = this.getProfilePath(name);

    if (!this.fileSystem.existsSync(profilePath)) {
      return {
        success: false,
        message: `Profile '${name}' does not exist.`,
      };
    }

    if (currentProfile === name) {
      return {
        success: false,
        message: `Cannot delete the currently active profile '${name}'.`,
      };
    }

    try {
      this.fileSystem.unlinkSync(profilePath);
      return {
        success: true,
        message: `Profile '${name}' deleted.`,
      };
    } catch (err) {
      const error = err as Error;
      return {
        success: false,
        message: `Error deleting profile: ${error.message}`,
      };
    }
  }

  getProfileContent(name: string): { success: boolean; content?: string; message?: string } {
    if (!this.isValidProfileName(name)) {
      return { success: false, message: INVALID_PROFILE_NAME_MESSAGE };
    }

    const profilePath = this.getProfilePath(name);

    if (!this.fileSystem.existsSync(profilePath)) {
      return {
        success: false,
        message: `Profile '${name}' does not exist.`,
      };
    }

    try {
      const content = this.fileSystem.readFileSync(profilePath);
      return {
        success: true,
        content,
      };
    } catch (err) {
      const error = err as Error;
      return {
        success: false,
        message: `Error reading profile: ${error.message}`,
      };
    }
  }

  profileExists(name: string): boolean {
    if (!this.isValidProfileName(name)) {
      return false;
    }
    return this.fileSystem.existsSync(this.getProfilePath(name));
  }

  getProfilePath(name: string): string {
    if (!this.isValidProfileName(name)) {
      throw new InvalidProfileNameError(name);
    }

    const profilePath = path.join(this.config.profilesDir, `${name}${PROFILE_EXT}`);

    // 名前の検証を通っていれば到達しないが、パス組み立てを変えた際に
    // ディレクトリ外へ出ていないことをここでも確かめる
    if (path.dirname(path.resolve(profilePath)) !== path.resolve(this.config.profilesDir)) {
      throw new InvalidProfileNameError(name);
    }

    return profilePath;
  }

  private getDefaultHostsContent(): string {
    return `# Host Database
# localhost is used to configure the loopback interface
# when the system is booting. Do not change this entry.
127.0.0.1       localhost
255.255.255.255 broadcasthost
::1             localhost
`;
  }
}
