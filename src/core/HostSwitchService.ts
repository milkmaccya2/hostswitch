import * as crypto from 'crypto';
import { 
  IFileSystem, 
  ILogger, 
  HostSwitchConfig, 
  ProfileData, 
  SwitchResult, 
  CreateProfileResult, 
  ProfileInfo 
} from '../interfaces';

export class HostSwitchService {
  constructor(
    private fileSystem: IFileSystem,
    private logger: ILogger,
    private config: HostSwitchConfig
  ) {
    this.ensureDirs();
  }

  private ensureDirs(): void {
    this.fileSystem.ensureDirSync(this.config.configDir);
    this.fileSystem.ensureDirSync(this.config.profilesDir);
    this.fileSystem.ensureDirSync(this.config.backupDir);
  }

  getCurrentProfile(): string | null {
    const data = this.getCurrentProfileData();
    return data ? data.profile : null;
  }

  getProfiles(): ProfileInfo[] {
    const profiles = this.fileSystem.readdirSync(this.config.profilesDir)
      .filter(file => file.endsWith('.hosts'))
      .map(file => file.replace('.hosts', ''));
    
    const current = this.getCurrentProfile();
    
    return profiles.map(name => ({
      name,
      isCurrent: name === current
    }));
  }

  createProfile(name: string, fromCurrent: boolean = false): CreateProfileResult {
    const profilePath = this.getProfilePathPrivate(name);
    
    if (this.fileSystem.existsSync(profilePath)) {
      return {
        success: false,
        message: `Profile '${name}' already exists.`
      };
    }

    try {
      if (fromCurrent) {
        this.fileSystem.copySync(this.config.hostsPath, profilePath);
        return {
          success: true,
          message: `Profile '${name}' created from current hosts file.`
        };
      } else {
        const defaultContent = this.getDefaultHostsContent();
        this.fileSystem.writeFileSync(profilePath, defaultContent);
        return {
          success: true,
          message: `Profile '${name}' created with default content.`
        };
      }
    } catch (err) {
      const error = err as Error;
      return {
        success: false,
        message: `Error creating profile: ${error.message}`
      };
    }
  }

  switchProfile(name: string): SwitchResult {
    const profilePath = this.getProfilePathPrivate(name);
    
    if (!this.fileSystem.existsSync(profilePath)) {
      return {
        success: false,
        message: `Profile '${name}' does not exist.`
      };
    }

    const currentProfile = this.getCurrentProfile();
    const isModified = this.isHostsModified();
    let backupPath: string | undefined;
    
    if (!currentProfile || isModified) {
      backupPath = this.backupHosts();
      if (isModified && currentProfile) {
        this.logger.warn('Current hosts file was modified outside of hostswitch.');
      }
    }

    try {
      this.fileSystem.copySync(profilePath, this.config.hostsPath);
      this.setCurrentProfile(name);
      return {
        success: true,
        message: `Switched to profile '${name}'.`,
        backupPath
      };
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === 'EACCES') {
        return {
          success: false,
          message: 'Permission denied. Run with sudo.'
        };
      } else {
        return {
          success: false,
          message: `Error switching profile: ${error.message}`
        };
      }
    }
  }

  deleteProfile(name: string): { success: boolean; message: string } {
    const profilePath = this.getProfilePathPrivate(name);
    
    if (!this.fileSystem.existsSync(profilePath)) {
      return {
        success: false,
        message: `Profile '${name}' does not exist.`
      };
    }

    const current = this.getCurrentProfile();
    if (current === name) {
      return {
        success: false,
        message: `Cannot delete the currently active profile '${name}'.`
      };
    }

    try {
      this.fileSystem.unlinkSync(profilePath);
      return {
        success: true,
        message: `Profile '${name}' deleted.`
      };
    } catch (err) {
      const error = err as Error;
      return {
        success: false,
        message: `Error deleting profile: ${error.message}`
      };
    }
  }

  getProfileContent(name: string): { success: boolean; content?: string; message?: string } {
    const profilePath = this.getProfilePathPrivate(name);
    
    if (!this.fileSystem.existsSync(profilePath)) {
      return {
        success: false,
        message: `Profile '${name}' does not exist.`
      };
    }

    try {
      const content = this.fileSystem.readFileSync(profilePath);
      return {
        success: true,
        content
      };
    } catch (err) {
      const error = err as Error;
      return {
        success: false,
        message: `Error reading profile: ${error.message}`
      };
    }
  }

  profileExists(name: string): boolean {
    const profilePath = this.getProfilePathPrivate(name);
    return this.fileSystem.existsSync(profilePath);
  }

  private setCurrentProfile(profileName: string): void {
    const checksum = this.getHostsChecksum();
    this.fileSystem.writeJsonSync(this.config.currentProfileFile, { 
      profile: profileName,
      checksum: checksum,
      updatedAt: new Date().toISOString()
    });
  }

  private getHostsChecksum(): string | null {
    try {
      const content = this.fileSystem.readFileSync(this.config.hostsPath);
      return crypto.createHash('md5').update(content).digest('hex');
    } catch (err) {
      return null;
    }
  }

  private isHostsModified(): boolean {
    const currentData = this.getCurrentProfileData();
    if (!currentData || !currentData.checksum) {
      return true;
    }
    const currentChecksum = this.getHostsChecksum();
    return currentChecksum !== currentData.checksum;
  }

  private getCurrentProfileData(): ProfileData | null {
    try {
      if (this.fileSystem.existsSync(this.config.currentProfileFile)) {
        return this.fileSystem.readJsonSync(this.config.currentProfileFile) as ProfileData;
      }
    } catch (err) {
      // エラーログはlogger経由で出力しないでnullを返すだけにする
      // CLI層でハンドリングする
    }
    return null;
  }

  private backupHosts(): string | undefined {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${this.config.backupDir}/hosts_${timestamp}`;
    try {
      this.fileSystem.copySync(this.config.hostsPath, backupPath);
      return backupPath;
    } catch (err) {
      return undefined;
    }
  }

  getProfilePath(name: string): string {
    return `${this.config.profilesDir}/${name}.hosts`;
  }

  private getProfilePathPrivate(name: string): string {
    return this.getProfilePath(name);
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