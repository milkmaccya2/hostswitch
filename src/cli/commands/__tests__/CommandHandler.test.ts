import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CommandHandler } from '../index'
import { ILogger, IProcessManager } from '../../../interfaces'

describe('CommandHandler', () => {
  let commandHandler: CommandHandler
  let mockService: any
  let mockLogger: any
  let mockProcessManager: any

  beforeEach(() => {
    mockService = {
      getProfiles: vi.fn(),
      createProfile: vi.fn(),
      switchProfile: vi.fn(),
      deleteProfile: vi.fn(),
      getProfileContent: vi.fn(),
      profileExists: vi.fn(),
      getProfilePath: vi.fn()
    } as any

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      dim: vi.fn(),
      bold: vi.fn()
    } as ILogger

    mockProcessManager = {
      executeEditor: vi.fn()
    } as IProcessManager

    commandHandler = new CommandHandler(mockService, mockLogger, mockProcessManager)
  })

  describe('handleList()', () => {
    it('プロファイルが存在しない場合は警告を表示', async () => {
      mockService.getProfiles.mockReturnValue([])

      await commandHandler.handleList()

      expect(mockLogger.warn).toHaveBeenCalledWith('No profiles found.')
      expect(mockLogger.bold).not.toHaveBeenCalled()
    })

    it('プロファイル一覧を表示', async () => {
      const profiles = [
        { name: 'dev', isCurrent: true },
        { name: 'staging', isCurrent: false },
        { name: 'production', isCurrent: false }
      ]
      mockService.getProfiles.mockReturnValue(profiles)

      await commandHandler.handleList()

      expect(mockLogger.bold).toHaveBeenCalledWith('Available profiles:')
      expect(mockLogger.info).toHaveBeenCalledWith('  - dev [current]')
      expect(mockLogger.info).toHaveBeenCalledWith('  - staging')
      expect(mockLogger.info).toHaveBeenCalledWith('  - production')
    })

    it('現在のプロファイルに[current]マーカーを表示', async () => {
      const profiles = [
        { name: 'test', isCurrent: true }
      ]
      mockService.getProfiles.mockReturnValue(profiles)

      await commandHandler.handleList()

      expect(mockLogger.info).toHaveBeenCalledWith('  - test [current]')
    })
  })

  describe('handleCreate()', () => {
    it('プロファイル作成成功時に成功メッセージを表示', async () => {
      const result = { success: true, message: 'Profile created successfully' }
      mockService.createProfile.mockReturnValue(result)

      await commandHandler.handleCreate('test-profile')

      expect(mockService.createProfile).toHaveBeenCalledWith('test-profile', false)
      expect(mockLogger.success).toHaveBeenCalledWith('Profile created successfully')
    })

    it('プロファイル作成失敗時にエラーメッセージを表示', async () => {
      const result = { success: false, message: 'Profile already exists' }
      mockService.createProfile.mockReturnValue(result)

      await commandHandler.handleCreate('existing-profile')

      expect(mockLogger.error).toHaveBeenCalledWith('Profile already exists')
    })

    it('fromCurrentオプションがtrueの場合は現在のhostsから作成', async () => {
      const result = { success: true, message: 'Profile created from current hosts' }
      mockService.createProfile.mockReturnValue(result)

      await commandHandler.handleCreate('test-profile', true)

      expect(mockService.createProfile).toHaveBeenCalledWith('test-profile', true)
    })
  })

  describe('handleSwitch()', () => {
    it('プロファイル切り替え成功時に成功メッセージを表示', async () => {
      const result = { success: true, message: 'Switched to profile test' }
      mockService.switchProfile.mockReturnValue(result)

      await commandHandler.handleSwitch('test')

      expect(mockService.switchProfile).toHaveBeenCalledWith('test')
      expect(mockLogger.success).toHaveBeenCalledWith('Switched to profile test')
    })

    it('バックアップパスがある場合はバックアップ情報を表示', async () => {
      const result = { 
        success: true, 
        message: 'Switched to profile test',
        backupPath: '/backup/hosts_2023-01-01.bak'
      }
      mockService.switchProfile.mockReturnValue(result)

      await commandHandler.handleSwitch('test')

      expect(mockLogger.dim).toHaveBeenCalledWith('Current hosts backed up to: /backup/hosts_2023-01-01.bak')
      expect(mockLogger.success).toHaveBeenCalledWith('Switched to profile test')
    })

    it('プロファイル切り替え失敗時にエラーメッセージを表示', async () => {
      const result = { success: false, message: 'Profile not found' }
      mockService.switchProfile.mockReturnValue(result)

      await commandHandler.handleSwitch('nonexistent')

      expect(mockLogger.error).toHaveBeenCalledWith('Profile not found')
    })
  })

  describe('handleDelete()', () => {
    it('プロファイル削除成功時に成功メッセージを表示', async () => {
      const result = { success: true, message: 'Profile deleted successfully' }
      mockService.deleteProfile.mockReturnValue(result)

      await commandHandler.handleDelete('test-profile')

      expect(mockService.deleteProfile).toHaveBeenCalledWith('test-profile')
      expect(mockLogger.success).toHaveBeenCalledWith('Profile deleted successfully')
    })

    it('プロファイル削除失敗時にエラーメッセージを表示', async () => {
      const result = { success: false, message: 'Cannot delete active profile' }
      mockService.deleteProfile.mockReturnValue(result)

      await commandHandler.handleDelete('active-profile')

      expect(mockLogger.error).toHaveBeenCalledWith('Cannot delete active profile')
    })
  })

  describe('handleShow()', () => {
    it('プロファイル内容表示成功時にコンテンツを表示', async () => {
      const result = { success: true, content: '127.0.0.1 localhost' }
      mockService.getProfileContent.mockReturnValue(result)
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await commandHandler.handleShow('test-profile')

      expect(mockService.getProfileContent).toHaveBeenCalledWith('test-profile')
      expect(mockLogger.bold).toHaveBeenCalledWith("Content of profile 'test-profile':")
      expect(mockLogger.dim).toHaveBeenCalledWith('-'.repeat(40))
      expect(consoleSpy).toHaveBeenCalledWith('127.0.0.1 localhost')

      consoleSpy.mockRestore()
    })

    it('プロファイル内容取得失敗時にエラーメッセージを表示', async () => {
      const result = { success: false, message: 'Profile not found' }
      mockService.getProfileContent.mockReturnValue(result)

      await commandHandler.handleShow('nonexistent')

      expect(mockLogger.error).toHaveBeenCalledWith('Profile not found')
    })
  })

  describe('handleEdit()', () => {
    it('プロファイルが存在しない場合はエラーメッセージを表示', async () => {
      mockService.profileExists.mockReturnValue(false)

      await commandHandler.handleEdit('nonexistent')

      expect(mockService.profileExists).toHaveBeenCalledWith('nonexistent')
      expect(mockLogger.error).toHaveBeenCalledWith("Profile 'nonexistent' does not exist.")
      expect(mockProcessManager.executeEditor).not.toHaveBeenCalled()
    })

    it('デフォルトエディタ（vi）でプロファイルを編集', async () => {
      mockService.profileExists.mockReturnValue(true)
      mockService.getProfilePath.mockReturnValue('/path/to/profile')
      mockProcessManager.executeEditor.mockResolvedValue(undefined)
      
      // process.env.EDITORをクリア
      delete process.env.EDITOR

      await commandHandler.handleEdit('test-profile')

      expect(mockService.getProfilePath).toHaveBeenCalledWith('test-profile')
      expect(mockProcessManager.executeEditor).toHaveBeenCalledWith('vi', '/path/to/profile')
    })

    it('環境変数EDITORで指定されたエディタでプロファイルを編集', async () => {
      mockService.profileExists.mockReturnValue(true)
      mockService.getProfilePath.mockReturnValue('/path/to/profile')
      mockProcessManager.executeEditor.mockResolvedValue(undefined)
      
      process.env.EDITOR = 'code --wait'

      await commandHandler.handleEdit('test-profile')

      expect(mockProcessManager.executeEditor).toHaveBeenCalledWith('code --wait', '/path/to/profile')
      
      // 環境変数をクリア
      delete process.env.EDITOR
    })

    it('エディタ実行エラー時にエラーメッセージを表示', async () => {
      mockService.profileExists.mockReturnValue(true)
      mockService.getProfilePath.mockReturnValue('/path/to/profile')
      mockProcessManager.executeEditor.mockRejectedValue(new Error('Editor not found'))

      await commandHandler.handleEdit('test-profile')

      expect(mockLogger.error).toHaveBeenCalledWith('Error opening editor: Editor not found')
    })
  })
})