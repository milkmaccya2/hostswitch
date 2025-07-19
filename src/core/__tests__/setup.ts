import { HostSwitchConfig } from '../../interfaces'
import { MockFileSystem, MockLogger, MockPermissionChecker } from '../../__mocks__'

export function createTestConfig(): HostSwitchConfig {
  return {
    configDir: '/test/.hostswitch',
    profilesDir: '/test/.hostswitch/profiles',
    backupDir: '/test/.hostswitch/backups', 
    hostsPath: '/etc/hosts',
    currentProfileFile: '/test/.hostswitch/current.json'
  }
}

export function createTestMocks() {
  const mockFileSystem = new MockFileSystem()
  const mockLogger = new MockLogger()
  const mockPermissionChecker = new MockPermissionChecker()
  const config = createTestConfig()

  mockFileSystem.ensureDirSync(config.configDir)
  mockFileSystem.ensureDirSync(config.profilesDir)
  mockFileSystem.ensureDirSync(config.backupDir)

  return {
    mockFileSystem,
    mockLogger,
    mockPermissionChecker,
    config
  }
}

export function createTestProfiles(mockFileSystem: MockFileSystem, config: HostSwitchConfig) {
  const profiles = {
    dev: `# Development environment
127.0.0.1    api.local
127.0.0.1    app.local`,
    
    staging: `# Staging environment  
192.168.1.100    api.staging
192.168.1.100    app.staging`,
    
    production: `# Production environment
10.0.0.100    api.production
10.0.0.100    app.production`
  }

  Object.entries(profiles).forEach(([name, content]) => {
    mockFileSystem.setFile(`${config.profilesDir}/${name}.hosts`, content)
  })

  return profiles
}

export function setCurrentProfile(
  mockFileSystem: MockFileSystem, 
  config: HostSwitchConfig, 
  profileName: string,
  checksum: string = 'test-checksum'
) {
  const currentData = {
    profile: profileName,
    checksum,
    updatedAt: '2024-01-01T00:00:00.000Z'
  }
  
  mockFileSystem.setFile(config.currentProfileFile, JSON.stringify(currentData, null, 2))
}