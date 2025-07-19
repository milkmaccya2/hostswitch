import { describe, it, expect, beforeEach } from 'vitest'
import { ProfileManager } from '../ProfileManager'
import { createTestMocks } from './setup'

describe('ProfileManager', () => {
  let profileManager: ProfileManager
  let mocks: ReturnType<typeof createTestMocks>

  beforeEach(() => {
    mocks = createTestMocks()
    profileManager = new ProfileManager(mocks.mockFileSystem, mocks.config)
  })

  describe('getProfiles()', () => {
    it('プロファイルが0個の場合は空配列を返す', () => {
      const result = profileManager.getProfiles(null)
      expect(result).toEqual([])
    })

    it('プロファイルが複数ある場合は全て返す', () => {
      mocks.mockFileSystem.setFile(`${mocks.config.profilesDir}/dev.hosts`, 'dev content')
      mocks.mockFileSystem.setFile(`${mocks.config.profilesDir}/staging.hosts`, 'staging content')
      
      const result = profileManager.getProfiles(null)
      
      expect(result).toHaveLength(2)
      const profileNames = result.map(p => p.name)
      expect(profileNames).toContain('dev')
      expect(profileNames).toContain('staging')
    })

    it('現在のプロファイルにisCurrent=trueが付く', () => {
      mocks.mockFileSystem.setFile(`${mocks.config.profilesDir}/dev.hosts`, 'content')
      mocks.mockFileSystem.setFile(`${mocks.config.profilesDir}/staging.hosts`, 'content')
      
      const result = profileManager.getProfiles('dev')
      
      const devProfile = result.find(p => p.name === 'dev')
      const stagingProfile = result.find(p => p.name === 'staging')
      
      expect(devProfile?.isCurrent).toBe(true)
      expect(stagingProfile?.isCurrent).toBe(false)
    })

    it('.hostsファイル以外は無視される', () => {
      mocks.mockFileSystem.setFile(`${mocks.config.profilesDir}/dev.hosts`, 'content')
      mocks.mockFileSystem.setFile(`${mocks.config.profilesDir}/readme.txt`, 'readme')
      mocks.mockFileSystem.setFile(`${mocks.config.profilesDir}/config.json`, '{}')
      
      const result = profileManager.getProfiles(null)
      
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('dev')
    })
  })

  describe('createProfile()', () => {
    it('新規プロファイル作成が成功する（デフォルト内容）', () => {
      const result = profileManager.createProfile('test')
      
      expect(result.success).toBe(true)
      expect(result.message).toContain('test')
      expect(result.message).toContain('default')
      
      const content = mocks.mockFileSystem.getFile(`${mocks.config.profilesDir}/test.hosts`)
      expect(content).toContain('127.0.0.1       localhost')
    })

    it('新規プロファイル作成が成功する（現在のhostsから）', () => {
      mocks.mockFileSystem.setFile(mocks.config.hostsPath, '127.0.0.1 example.com')
      
      const result = profileManager.createProfile('test', true)
      
      expect(result.success).toBe(true)
      expect(result.message).toContain('test')
      expect(result.message).toContain('current hosts')
      
      const content = mocks.mockFileSystem.getFile(`${mocks.config.profilesDir}/test.hosts`)
      expect(content).toBe('127.0.0.1 example.com')
    })

    it('既存プロファイル名だとエラーを返す', () => {
      mocks.mockFileSystem.setFile(`${mocks.config.profilesDir}/existing.hosts`, 'content')
      
      const result = profileManager.createProfile('existing')
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('already exists')
    })

    it('ファイル書き込みエラー時にエラーを返す', () => {
      const error = new Error('Cannot write file')
      mocks.mockFileSystem.setThrowErrorOnNext(error)
      
      const result = profileManager.createProfile('test')
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('Error creating profile')
      expect(result.message).toContain('Cannot write file')
    })
  })

  describe('deleteProfile()', () => {
    it('存在するプロファイルの削除が成功', () => {
      mocks.mockFileSystem.setFile(`${mocks.config.profilesDir}/test.hosts`, 'content')
      
      const result = profileManager.deleteProfile('test', null)
      
      expect(result.success).toBe(true)
      expect(result.message).toContain('deleted')
      expect(mocks.mockFileSystem.existsSync(`${mocks.config.profilesDir}/test.hosts`)).toBe(false)
    })

    it('存在しないプロファイルだとエラー', () => {
      const result = profileManager.deleteProfile('nonexistent', null)
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('does not exist')
    })

    it('現在アクティブなプロファイルは削除できない', () => {
      mocks.mockFileSystem.setFile(`${mocks.config.profilesDir}/active.hosts`, 'content')
      
      const result = profileManager.deleteProfile('active', 'active')
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('currently active')
    })

    it('ファイル削除エラー時にエラーを返す', () => {
      mocks.mockFileSystem.setFile(`${mocks.config.profilesDir}/test.hosts`, 'content')
      
      const error = new Error('File is locked')
      mocks.mockFileSystem.setThrowErrorOnNext(error)
      
      const result = profileManager.deleteProfile('test', null)
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('Error deleting profile')
      expect(result.message).toContain('File is locked')
    })
  })

  describe('getProfileContent()', () => {
    it('存在するプロファイルの内容を取得', () => {
      const content = 'test profile content'
      mocks.mockFileSystem.setFile(`${mocks.config.profilesDir}/test.hosts`, content)
      
      const result = profileManager.getProfileContent('test')
      
      expect(result.success).toBe(true)
      expect(result.content).toBe(content)
    })

    it('存在しないプロファイルだとエラー', () => {
      const result = profileManager.getProfileContent('nonexistent')
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('does not exist')
    })

    it('読み込みエラー時にエラーを返す', () => {
      mocks.mockFileSystem.setFile(`${mocks.config.profilesDir}/test.hosts`, 'content')
      
      const originalReadFileSync = mocks.mockFileSystem.readFileSync
      mocks.mockFileSystem.readFileSync = () => {
        throw new Error('Cannot read file')
      }
      
      const result = profileManager.getProfileContent('test')
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('Error reading profile')
      expect(result.message).toContain('Cannot read file')
      
      mocks.mockFileSystem.readFileSync = originalReadFileSync
    })
  })

  describe('profileExists()', () => {
    it('存在するプロファイルでtrue', () => {
      mocks.mockFileSystem.setFile(`${mocks.config.profilesDir}/test.hosts`, 'content')
      
      const result = profileManager.profileExists('test')
      
      expect(result).toBe(true)
    })

    it('存在しないプロファイルでfalse', () => {
      const result = profileManager.profileExists('nonexistent')
      
      expect(result).toBe(false)
    })
  })

  describe('getProfilePath()', () => {
    it('正しいプロファイルパスを返す', () => {
      const result = profileManager.getProfilePath('test')
      
      expect(result).toBe(`${mocks.config.profilesDir}/test.hosts`)
    })
  })
})