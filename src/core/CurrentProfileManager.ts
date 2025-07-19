import * as crypto from 'crypto'
import { IFileSystem, HostSwitchConfig, ProfileData } from '../interfaces'

export class CurrentProfileManager {
  constructor(
    private fileSystem: IFileSystem,
    private config: HostSwitchConfig
  ) {}

  getCurrentProfile(): string | null {
    const data = this.getCurrentProfileData()
    return data ? data.profile : null
  }

  setCurrentProfile(profileName: string): void {
    const checksum = this.getHostsChecksum()
    this.fileSystem.writeJsonSync(this.config.currentProfileFile, { 
      profile: profileName,
      checksum: checksum,
      updatedAt: new Date().toISOString()
    })
  }

  isHostsModified(): boolean {
    const currentData = this.getCurrentProfileData()
    if (!currentData || !currentData.checksum) {
      return true
    }
    const currentChecksum = this.getHostsChecksum()
    return currentChecksum !== currentData.checksum
  }

  private getCurrentProfileData(): ProfileData | null {
    try {
      if (this.fileSystem.existsSync(this.config.currentProfileFile)) {
        return this.fileSystem.readJsonSync(this.config.currentProfileFile) as ProfileData
      }
    } catch (err) {
      // エラーログはlogger経由で出力しないでnullを返すだけにする
    }
    return null
  }

  private getHostsChecksum(): string | null {
    try {
      const content = this.fileSystem.readFileSync(this.config.hostsPath)
      return crypto.createHash('md5').update(content).digest('hex')
    } catch (err) {
      return null
    }
  }
}