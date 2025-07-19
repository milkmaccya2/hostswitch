import { IFileSystem, HostSwitchConfig, ProfileInfo, CreateProfileResult } from '../interfaces'

export class ProfileManager {
  constructor(
    private fileSystem: IFileSystem,
    private config: HostSwitchConfig
  ) {}

  getProfiles(currentProfile: string | null): ProfileInfo[] {
    const profiles = this.fileSystem.readdirSync(this.config.profilesDir)
      .filter(file => file.endsWith('.hosts'))
      .map(file => file.replace('.hosts', ''))
    
    return profiles.map(name => ({
      name,
      isCurrent: name === currentProfile
    }))
  }

  createProfile(name: string, fromCurrent: boolean = false): CreateProfileResult {
    const profilePath = this.getProfilePath(name)
    
    if (this.fileSystem.existsSync(profilePath)) {
      return {
        success: false,
        message: `Profile '${name}' already exists.`
      }
    }

    try {
      if (fromCurrent) {
        this.fileSystem.copySync(this.config.hostsPath, profilePath)
        return {
          success: true,
          message: `Profile '${name}' created from current hosts file.`
        }
      } else {
        const defaultContent = this.getDefaultHostsContent()
        this.fileSystem.writeFileSync(profilePath, defaultContent)
        return {
          success: true,
          message: `Profile '${name}' created with default content.`
        }
      }
    } catch (err) {
      const error = err as Error
      return {
        success: false,
        message: `Error creating profile: ${error.message}`
      }
    }
  }

  deleteProfile(name: string, currentProfile: string | null): { success: boolean; message: string } {
    const profilePath = this.getProfilePath(name)
    
    if (!this.fileSystem.existsSync(profilePath)) {
      return {
        success: false,
        message: `Profile '${name}' does not exist.`
      }
    }

    if (currentProfile === name) {
      return {
        success: false,
        message: `Cannot delete the currently active profile '${name}'.`
      }
    }

    try {
      this.fileSystem.unlinkSync(profilePath)
      return {
        success: true,
        message: `Profile '${name}' deleted.`
      }
    } catch (err) {
      const error = err as Error
      return {
        success: false,
        message: `Error deleting profile: ${error.message}`
      }
    }
  }

  getProfileContent(name: string): { success: boolean; content?: string; message?: string } {
    const profilePath = this.getProfilePath(name)
    
    if (!this.fileSystem.existsSync(profilePath)) {
      return {
        success: false,
        message: `Profile '${name}' does not exist.`
      }
    }

    try {
      const content = this.fileSystem.readFileSync(profilePath)
      return {
        success: true,
        content
      }
    } catch (err) {
      const error = err as Error
      return {
        success: false,
        message: `Error reading profile: ${error.message}`
      }
    }
  }

  profileExists(name: string): boolean {
    const profilePath = this.getProfilePath(name)
    return this.fileSystem.existsSync(profilePath)
  }

  getProfilePath(name: string): string {
    return `${this.config.profilesDir}/${name}.hosts`
  }

  private getDefaultHostsContent(): string {
    return `# Host Database
# localhost is used to configure the loopback interface
# when the system is booting. Do not change this entry.
127.0.0.1       localhost
255.255.255.255 broadcasthost
::1             localhost
`
  }
}