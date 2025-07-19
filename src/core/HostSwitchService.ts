import { 
  IFileSystem, 
  ILogger, 
  HostSwitchConfig, 
  SwitchResult, 
  CreateProfileResult, 
  ProfileInfo 
} from '../interfaces'
import { ProfileManager } from './ProfileManager'
import { CurrentProfileManager } from './CurrentProfileManager'
import { BackupManager } from './BackupManager'

export class HostSwitchService {
  private profileManager: ProfileManager
  private currentProfileManager: CurrentProfileManager
  private backupManager: BackupManager

  constructor(
    private fileSystem: IFileSystem,
    private logger: ILogger,
    private config: HostSwitchConfig
  ) {
    this.ensureDirs()
    this.profileManager = new ProfileManager(fileSystem, config)
    this.currentProfileManager = new CurrentProfileManager(fileSystem, config)
    this.backupManager = new BackupManager(fileSystem, config)
  }

  private ensureDirs(): void {
    this.fileSystem.ensureDirSync(this.config.configDir)
    this.fileSystem.ensureDirSync(this.config.profilesDir)
    this.fileSystem.ensureDirSync(this.config.backupDir)
  }

  getCurrentProfile(): string | null {
    return this.currentProfileManager.getCurrentProfile()
  }

  getProfiles(): ProfileInfo[] {
    const currentProfile = this.getCurrentProfile()
    return this.profileManager.getProfiles(currentProfile)
  }

  createProfile(name: string, fromCurrent: boolean = false): CreateProfileResult {
    return this.profileManager.createProfile(name, fromCurrent)
  }

  switchProfile(name: string): SwitchResult {
    if (!this.profileManager.profileExists(name)) {
      return {
        success: false,
        message: `Profile '${name}' does not exist.`
      }
    }

    const currentProfile = this.getCurrentProfile()
    const isModified = this.currentProfileManager.isHostsModified()
    let backupPath: string | undefined

    if (!currentProfile || isModified) {
      backupPath = this.backupManager.backupHosts()
      if (isModified && currentProfile) {
        this.logger.warn('Current hosts file was modified outside of hostswitch.')
      }
    }

    try {
      const profilePath = this.profileManager.getProfilePath(name)
      this.fileSystem.copySync(profilePath, this.config.hostsPath)
      this.currentProfileManager.setCurrentProfile(name)
      return {
        success: true,
        message: `Switched to profile '${name}'.`,
        backupPath
      }
    } catch (err) {
      const error = err as NodeJS.ErrnoException
      if (error.code === 'EACCES') {
        return {
          success: false,
          message: 'Permission denied. Run with sudo.'
        }
      } else {
        return {
          success: false,
          message: `Error switching profile: ${error.message}`
        }
      }
    }
  }

  deleteProfile(name: string): { success: boolean; message: string } {
    const currentProfile = this.getCurrentProfile()
    return this.profileManager.deleteProfile(name, currentProfile)
  }

  getProfileContent(name: string): { success: boolean; content?: string; message?: string } {
    return this.profileManager.getProfileContent(name)
  }

  profileExists(name: string): boolean {
    return this.profileManager.profileExists(name)
  }

  getProfilePath(name: string): string {
    return this.profileManager.getProfilePath(name)
  }
}