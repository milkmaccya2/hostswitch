import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { HostSwitchService } from '../core/HostSwitchService'
import { CommandHandler } from '../cli/commands'
import { CliApplication } from '../cli/CliApplication'
import { FileSystemAdapter } from '../infrastructure/FileSystemAdapter'
import { ChalkLogger } from '../infrastructure/ChalkLogger'
import { ProcessManager } from '../infrastructure/ProcessManager'
import { createConfig } from '../config'

// モジュールのモック
vi.mock('../core/HostSwitchService')
vi.mock('../cli/commands')
vi.mock('../cli/CliApplication')
vi.mock('../infrastructure/FileSystemAdapter')
vi.mock('../infrastructure/ChalkLogger')
vi.mock('../infrastructure/ProcessManager')
vi.mock('../config')

describe('hostswitch.ts - エントリーポイント', () => {
  let mockHostSwitchService: any
  let mockCommandHandler: any
  let mockCliApplication: any
  let mockFileSystemAdapter: any
  let mockChalkLogger: any
  let mockProcessManager: any
  let mockCreateConfig: any

  beforeEach(() => {
    // モックインスタンスを設定
    mockHostSwitchService = vi.fn()
    mockCommandHandler = vi.fn()
    mockCliApplication = {
      setupCommands: vi.fn(),
      run: vi.fn()
    }
    mockFileSystemAdapter = vi.fn()
    mockChalkLogger = vi.fn()
    mockProcessManager = vi.fn()
    mockCreateConfig = vi.fn().mockReturnValue({
      configDir: '/test/.hostswitch',
      profilesDir: '/test/.hostswitch/profiles',
      backupDir: '/test/.hostswitch/backups',
      hostsPath: '/etc/hosts',
      currentProfileFile: '/test/.hostswitch/current.json'
    })

    // モックの設定
    vi.mocked(HostSwitchService).mockImplementation(() => mockHostSwitchService)
    vi.mocked(CommandHandler).mockImplementation(() => mockCommandHandler)
    vi.mocked(CliApplication).mockImplementation(() => mockCliApplication)
    vi.mocked(FileSystemAdapter).mockImplementation(() => mockFileSystemAdapter)
    vi.mocked(ChalkLogger).mockImplementation(() => mockChalkLogger)
    vi.mocked(ProcessManager).mockImplementation(() => mockProcessManager)
    vi.mocked(createConfig).mockImplementation(mockCreateConfig)

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('依存性の組み立て', () => {
    it('全ての依存関係が正しい順序で初期化される', async () => {
      // エントリーポイントを動的インポート
      await import('../hostswitch')

      // 設定の作成が最初に呼ばれる
      expect(mockCreateConfig).toHaveBeenCalledTimes(1)

      // インフラストラクチャ層が初期化される
      expect(FileSystemAdapter).toHaveBeenCalledTimes(1)
      expect(ChalkLogger).toHaveBeenCalledTimes(1)
      expect(ProcessManager).toHaveBeenCalledTimes(1)

      // サービス層が依存関係と共に初期化される
      expect(HostSwitchService).toHaveBeenCalledWith(
        mockFileSystemAdapter,
        mockChalkLogger,
        expect.any(Object) // config
      )

      // CLI層が初期化される
      expect(CommandHandler).toHaveBeenCalledWith(
        mockHostSwitchService,
        mockChalkLogger,
        mockProcessManager
      )

      expect(CliApplication).toHaveBeenCalledWith(mockCommandHandler)
    })

    it('CLIアプリケーションが正しく起動される', async () => {
      await import('../hostswitch')

      // CLIアプリケーションのセットアップと実行が呼ばれる
      expect(mockCliApplication.setupCommands).toHaveBeenCalledTimes(1)
      expect(mockCliApplication.run).toHaveBeenCalledTimes(1)
    })
  })

  describe('エラーハンドリング', () => {
    it('設定作成でエラーが発生した場合は例外を投げる', async () => {
      const configError = new Error('Config creation failed')
      vi.mocked(createConfig).mockImplementation(() => {
        throw configError
      })

      await expect(import('../hostswitch')).rejects.toThrow('Config creation failed')
    })

    it('FileSystemAdapter初期化でエラーが発生した場合は例外を投げる', async () => {
      const fsError = new Error('FileSystem initialization failed')
      vi.mocked(FileSystemAdapter).mockImplementation(() => {
        throw fsError
      })

      await expect(import('../hostswitch')).rejects.toThrow('FileSystem initialization failed')
    })

    it('HostSwitchService初期化でエラーが発生した場合は例外を投げる', async () => {
      const serviceError = new Error('Service initialization failed')
      vi.mocked(HostSwitchService).mockImplementation(() => {
        throw serviceError
      })

      await expect(import('../hostswitch')).rejects.toThrow('Service initialization failed')
    })

    it('CommandHandler初期化でエラーが発生した場合は例外を投げる', async () => {
      const handlerError = new Error('CommandHandler initialization failed')
      vi.mocked(CommandHandler).mockImplementation(() => {
        throw handlerError
      })

      await expect(import('../hostswitch')).rejects.toThrow('CommandHandler initialization failed')
    })

    it('CliApplication初期化でエラーが発生した場合は例外を投げる', async () => {
      const cliError = new Error('CliApplication initialization failed')
      vi.mocked(CliApplication).mockImplementation(() => {
        throw cliError
      })

      await expect(import('../hostswitch')).rejects.toThrow('CliApplication initialization failed')
    })

    it('setupCommands()でエラーが発生した場合は例外を投げる', async () => {
      const setupError = new Error('Setup commands failed')
      mockCliApplication.setupCommands.mockImplementation(() => {
        throw setupError
      })

      await expect(import('../hostswitch')).rejects.toThrow('Setup commands failed')
    })

    it('run()でエラーが発生した場合は例外を投げる', async () => {
      const runError = new Error('Run failed')
      mockCliApplication.run.mockImplementation(() => {
        throw runError
      })

      await expect(import('../hostswitch')).rejects.toThrow('Run failed')
    })
  })

  describe('依存性注入の検証', () => {
    it('HostSwitchServiceに正しい依存関係が注入される', async () => {
      await import('../hostswitch')

      expect(HostSwitchService).toHaveBeenCalledWith(
        mockFileSystemAdapter,
        mockChalkLogger,
        expect.objectContaining({
          configDir: '/test/.hostswitch',
          profilesDir: '/test/.hostswitch/profiles',
          backupDir: '/test/.hostswitch/backups',
          hostsPath: '/etc/hosts',
          currentProfileFile: '/test/.hostswitch/current.json'
        })
      )
    })

    it('CommandHandlerに正しい依存関係が注入される', async () => {
      await import('../hostswitch')

      expect(CommandHandler).toHaveBeenCalledWith(
        mockHostSwitchService,
        mockChalkLogger,
        mockProcessManager
      )
    })

    it('CliApplicationに正しい依存関係が注入される', async () => {
      await import('../hostswitch')

      expect(CliApplication).toHaveBeenCalledWith(mockCommandHandler)
    })
  })

  describe('アプリケーションライフサイクル', () => {
    it('正常なアプリケーション起動フロー', async () => {
      await import('../hostswitch')

      // 依存関係の作成順序を確認
      const createConfigCall = vi.mocked(createConfig).mock.invocationCallOrder[0]
      const fileSystemCall = vi.mocked(FileSystemAdapter).mock.invocationCallOrder[0]
      const loggerCall = vi.mocked(ChalkLogger).mock.invocationCallOrder[0]
      const processManagerCall = vi.mocked(ProcessManager).mock.invocationCallOrder[0]
      const serviceCall = vi.mocked(HostSwitchService).mock.invocationCallOrder[0]
      const handlerCall = vi.mocked(CommandHandler).mock.invocationCallOrder[0]
      const cliCall = vi.mocked(CliApplication).mock.invocationCallOrder[0]
      const setupCall = mockCliApplication.setupCommands.mock.invocationCallOrder[0]
      const runCall = mockCliApplication.run.mock.invocationCallOrder[0]

      // 正しい順序で呼ばれることを確認
      expect(createConfigCall).toBeLessThan(fileSystemCall)
      expect(fileSystemCall).toBeLessThan(serviceCall)
      expect(loggerCall).toBeLessThan(serviceCall)
      expect(serviceCall).toBeLessThan(handlerCall)
      expect(handlerCall).toBeLessThan(cliCall)
      expect(cliCall).toBeLessThan(setupCall)
      expect(setupCall).toBeLessThan(runCall)
    })

    it('全ての依存関係が一度だけ作成される', async () => {
      await import('../hostswitch')

      expect(createConfig).toHaveBeenCalledTimes(1)
      expect(FileSystemAdapter).toHaveBeenCalledTimes(1)
      expect(ChalkLogger).toHaveBeenCalledTimes(1)
      expect(ProcessManager).toHaveBeenCalledTimes(1)
      expect(HostSwitchService).toHaveBeenCalledTimes(1)
      expect(CommandHandler).toHaveBeenCalledTimes(1)
      expect(CliApplication).toHaveBeenCalledTimes(1)
    })
  })
})