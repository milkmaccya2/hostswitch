import { describe, it, expect, beforeEach } from 'vitest'
import { CurrentProfileManager } from '../CurrentProfileManager'
import { createTestMocks, setCurrentProfile } from './setup'

describe('CurrentProfileManager', () => {
  let currentProfileManager: CurrentProfileManager
  let mocks: ReturnType<typeof createTestMocks>

  beforeEach(() => {
    mocks = createTestMocks()
    currentProfileManager = new CurrentProfileManager(mocks.mockFileSystem, mocks.config)
  })

  describe('getCurrentProfile()', () => {
    it('プロファイルが設定されていない場合はnullを返す', () => {
      const result = currentProfileManager.getCurrentProfile()
      expect(result).toBe(null)
    })

    it('プロファイルが設定されている場合は名前を返す', () => {
      setCurrentProfile(mocks.mockFileSystem, mocks.config, 'dev')
      
      const result = currentProfileManager.getCurrentProfile()
      
      expect(result).toBe('dev')
    })

    it('current.jsonが壊れている場合はnullを返す', () => {
      mocks.mockFileSystem.setFile(mocks.config.currentProfileFile, '{ invalid json')
      
      const result = currentProfileManager.getCurrentProfile()
      
      expect(result).toBe(null)
    })

    it('current.jsonが存在しない場合はnullを返す', () => {
      const result = currentProfileManager.getCurrentProfile()
      
      expect(result).toBe(null)
    })
  })

  describe('setCurrentProfile()', () => {
    it('プロファイル情報をcurrent.jsonに保存', () => {
      mocks.mockFileSystem.setFile(mocks.config.hostsPath, 'test hosts content')
      
      currentProfileManager.setCurrentProfile('dev')
      
      const currentData = mocks.mockFileSystem.readJsonSync(mocks.config.currentProfileFile)
      expect(currentData.profile).toBe('dev')
      expect(currentData.checksum).toBeDefined()
      expect(currentData.updatedAt).toBeDefined()
    })

    it('hostsファイルのチェックサムを含める', () => {
      const hostsContent = 'specific hosts content'
      mocks.mockFileSystem.setFile(mocks.config.hostsPath, hostsContent)
      
      currentProfileManager.setCurrentProfile('dev')
      
      const currentData = mocks.mockFileSystem.readJsonSync(mocks.config.currentProfileFile)
      expect(currentData.checksum).toBeDefined()
      expect(typeof currentData.checksum).toBe('string')
      expect(currentData.checksum.length).toBeGreaterThan(0)
    })

    it('異なるhostsファイル内容では異なるチェックサム', () => {
      mocks.mockFileSystem.setFile(mocks.config.hostsPath, 'content1')
      currentProfileManager.setCurrentProfile('dev1')
      const data1 = mocks.mockFileSystem.readJsonSync(mocks.config.currentProfileFile)
      
      mocks.mockFileSystem.setFile(mocks.config.hostsPath, 'content2')
      currentProfileManager.setCurrentProfile('dev2')
      const data2 = mocks.mockFileSystem.readJsonSync(mocks.config.currentProfileFile)
      
      expect(data1.checksum).not.toBe(data2.checksum)
    })
  })

  describe('isHostsModified()', () => {
    it('current.jsonが存在しない場合はtrueを返す', () => {
      const result = currentProfileManager.isHostsModified()
      
      expect(result).toBe(true)
    })

    it('チェックサム情報がない場合はtrueを返す', () => {
      const profileData = {
        profile: 'dev',
        checksum: null,
        updatedAt: new Date().toISOString()
      }
      mocks.mockFileSystem.setFile(mocks.config.currentProfileFile, JSON.stringify(profileData))
      
      const result = currentProfileManager.isHostsModified()
      
      expect(result).toBe(true)
    })

    it('hostsファイルが変更されていない場合はfalseを返す', () => {
      const hostsContent = 'unchanged content'
      mocks.mockFileSystem.setFile(mocks.config.hostsPath, hostsContent)
      
      currentProfileManager.setCurrentProfile('dev')
      
      const result = currentProfileManager.isHostsModified()
      
      expect(result).toBe(false)
    })

    it('hostsファイルが変更されている場合はtrueを返す', () => {
      mocks.mockFileSystem.setFile(mocks.config.hostsPath, 'original content')
      currentProfileManager.setCurrentProfile('dev')
      
      mocks.mockFileSystem.setFile(mocks.config.hostsPath, 'modified content')
      
      const result = currentProfileManager.isHostsModified()
      
      expect(result).toBe(true)
    })

    it('hostsファイルが読み取れない場合は変更されたとみなす', () => {
      setCurrentProfile(mocks.mockFileSystem, mocks.config, 'dev', 'some-checksum')
      
      const originalReadFileSync = mocks.mockFileSystem.readFileSync
      mocks.mockFileSystem.readFileSync = (path: string) => {
        if (path === mocks.config.hostsPath) {
          throw new Error('Cannot read hosts file')
        }
        return originalReadFileSync.call(mocks.mockFileSystem, path)
      }
      
      const result = currentProfileManager.isHostsModified()
      
      expect(result).toBe(true)
      
      mocks.mockFileSystem.readFileSync = originalReadFileSync
    })

    it('current.jsonが読み取れない場合は変更されたとみなす', () => {
      const originalReadJsonSync = mocks.mockFileSystem.readJsonSync
      mocks.mockFileSystem.readJsonSync = () => {
        throw new Error('Cannot read current.json')
      }
      
      const result = currentProfileManager.isHostsModified()
      
      expect(result).toBe(true)
      
      mocks.mockFileSystem.readJsonSync = originalReadJsonSync
    })
  })
})