import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HostSwitchService } from '../core/HostSwitchService'
import { CommandHandler } from '../cli/commands'
import { CliApplication } from '../cli/CliApplication'
import { FileSystemAdapter } from '../infrastructure/FileSystemAdapter'
import { ChalkLogger } from '../infrastructure/ChalkLogger'
import { ProcessManager } from '../infrastructure/ProcessManager'
import { PermissionChecker } from '../infrastructure/PermissionChecker'
import { createConfig } from '../config'

// 統合テスト - 各層の結合を確認
describe('Integration Tests', () => {
  describe('依存性の組み立て', () => {
    it('全ての依存関係が正しく作成される', () => {
      const config = createConfig()
      const fileSystem = new FileSystemAdapter()
      const logger = new ChalkLogger()
      const processManager = new ProcessManager()

      expect(config).toBeDefined()
      expect(config.configDir).toBeDefined()
      expect(config.hostsPath).toBeDefined()

      expect(fileSystem).toBeInstanceOf(FileSystemAdapter)
      expect(logger).toBeInstanceOf(ChalkLogger)
      expect(processManager).toBeInstanceOf(ProcessManager)
    })

    it('HostSwitchServiceが正しく初期化される', () => {
      const config = createConfig()
      const fileSystem = new FileSystemAdapter()
      const logger = new ChalkLogger()
      const permissionChecker = new PermissionChecker()

      const hostSwitchService = new HostSwitchService(fileSystem, logger, config, permissionChecker)

      expect(hostSwitchService).toBeInstanceOf(HostSwitchService)
      expect(hostSwitchService.getProfiles).toBeDefined()
      expect(hostSwitchService.createProfile).toBeDefined()
      expect(hostSwitchService.switchProfile).toBeDefined()
    })

    it('CommandHandlerが正しく初期化される', () => {
      const config = createConfig()
      const fileSystem = new FileSystemAdapter()
      const logger = new ChalkLogger()
      const processManager = new ProcessManager()
      const permissionChecker = new PermissionChecker()

      const hostSwitchService = new HostSwitchService(fileSystem, logger, config, permissionChecker)
      const commandHandler = new CommandHandler(hostSwitchService, logger, processManager)

      expect(commandHandler).toBeInstanceOf(CommandHandler)
      expect(commandHandler.handleList).toBeDefined()
      expect(commandHandler.handleCreate).toBeDefined()
      expect(commandHandler.handleSwitch).toBeDefined()
    })

    it('CliApplicationが正しく初期化される', () => {
      const config = createConfig()
      const fileSystem = new FileSystemAdapter()
      const logger = new ChalkLogger()
      const processManager = new ProcessManager()
      const permissionChecker = new PermissionChecker()

      const hostSwitchService = new HostSwitchService(fileSystem, logger, config, permissionChecker)
      const commandHandler = new CommandHandler(hostSwitchService, logger, processManager)
      const cliApp = new CliApplication(commandHandler)

      expect(cliApp).toBeInstanceOf(CliApplication)
      expect(cliApp.setupCommands).toBeDefined()
      expect(cliApp.run).toBeDefined()
    })
  })

  describe('レイヤー間通信', () => {
    let config: any
    let fileSystem: any
    let logger: any
    let processManager: any
    let permissionChecker: any
    let hostSwitchService: HostSwitchService
    let commandHandler: CommandHandler

    beforeEach(() => {
      config = createConfig()
      fileSystem = new FileSystemAdapter()
      logger = new ChalkLogger()
      processManager = new ProcessManager()
      permissionChecker = new PermissionChecker()

      hostSwitchService = new HostSwitchService(fileSystem, logger, config, permissionChecker)
      commandHandler = new CommandHandler(hostSwitchService, logger, processManager)

      // ログ出力をモック
      vi.spyOn(logger, 'info').mockImplementation(() => {})
      vi.spyOn(logger, 'warn').mockImplementation(() => {})
      vi.spyOn(logger, 'error').mockImplementation(() => {})
      vi.spyOn(logger, 'success').mockImplementation(() => {})
      vi.spyOn(logger, 'bold').mockImplementation(() => {})
      vi.spyOn(logger, 'dim').mockImplementation(() => {})
    })

    it('CLI → Service → Infrastructure の流れでプロファイル一覧が取得される', async () => {
      // ファイルシステムをモック（空のプロファイルディレクトリ）
      vi.spyOn(fileSystem, 'readdirSync').mockReturnValue([])

      await commandHandler.handleList()

      expect(logger.warn).toHaveBeenCalledWith('No profiles found.')
    })

    it('プロファイル作成の統合フロー', async () => {
      // ファイルシステムのモック
      vi.spyOn(fileSystem, 'existsSync').mockReturnValue(false) // プロファイルが存在しない
      vi.spyOn(fileSystem, 'writeFileSync').mockImplementation(() => {}) // 書き込み成功

      await commandHandler.handleCreate('test-profile')

      expect(fileSystem.writeFileSync).toHaveBeenCalled()
      expect(logger.success).toHaveBeenCalled()
    })

    it('エラーハンドリングの統合フロー', async () => {
      // ファイルシステムエラーをシミュレート
      vi.spyOn(fileSystem, 'existsSync').mockReturnValue(false)
      vi.spyOn(fileSystem, 'writeFileSync').mockImplementation(() => {
        throw new Error('Permission denied')
      })

      await commandHandler.handleCreate('test-profile')

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Permission denied'))
    })
  })

  describe('設定とインフラストラクチャの統合', () => {
    it('設定オブジェクトがHostSwitchServiceで正しく使用される', () => {
      const config = createConfig()
      const fileSystem = new FileSystemAdapter()
      const logger = new ChalkLogger()

      // ensureDirSyncが設定ディレクトリに対して呼ばれることを確認
      const ensureDirSpy = vi.spyOn(fileSystem, 'ensureDirSync').mockImplementation(() => {})

      // サービスを作成してensureDirsが呼ばれることを確認
      const permissionChecker = new PermissionChecker()
      new HostSwitchService(fileSystem, logger, config, permissionChecker)

      expect(ensureDirSpy).toHaveBeenCalledWith(config.configDir)
      expect(ensureDirSpy).toHaveBeenCalledWith(config.profilesDir)
      expect(ensureDirSpy).toHaveBeenCalledWith(config.backupDir)
    })

    it('プラットフォーム固有の設定が正しく適用される', () => {
      const config = createConfig()

      if (process.platform === 'win32') {
        expect(config.hostsPath).toBe('C:\\Windows\\System32\\drivers\\etc\\hosts')
      } else {
        expect(config.hostsPath).toBe('/etc/hosts')
      }
    })
  })

  describe('アプリケーション全体の初期化', () => {
    it('本番と同じ依存性組み立てが動作する', () => {
      // エントリーポイントと同じ初期化プロセス
      const config = createConfig()
      const fileSystem = new FileSystemAdapter()
      const logger = new ChalkLogger()
      const processManager = new ProcessManager()

      const permissionChecker = new PermissionChecker()
      const hostSwitchService = new HostSwitchService(fileSystem, logger, config, permissionChecker)
      const commandHandler = new CommandHandler(hostSwitchService, logger, processManager)
      const cliApp = new CliApplication(commandHandler)

      // 全ての依存関係が正しく結合されていることを確認
      expect(hostSwitchService).toBeDefined()
      expect(commandHandler).toBeDefined()
      expect(cliApp).toBeDefined()

      // setupCommandsが例外なく実行できることを確認
      expect(() => cliApp.setupCommands()).not.toThrow()
    })
  })
})