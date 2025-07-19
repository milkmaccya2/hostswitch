import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CliApplication } from '../CliApplication'
import { program } from 'commander'

vi.mock('commander', () => ({
  program: {
    name: vi.fn().mockReturnThis(),
    description: vi.fn().mockReturnThis(),
    version: vi.fn().mockReturnThis(),
    command: vi.fn().mockReturnThis(),
    alias: vi.fn().mockReturnThis(),
    option: vi.fn().mockReturnThis(),
    action: vi.fn().mockReturnThis(),
    parse: vi.fn().mockReturnThis()
  }
}))

vi.mock('fs-extra', () => ({
  readJsonSync: vi.fn()
}))

describe('CliApplication', () => {
  let cliApp: CliApplication
  let mockCommandHandler: any
  let mockProgram: any
  let mockFs: any

  beforeEach(async () => {
    mockCommandHandler = {
      handleList: vi.fn(),
      handleCreate: vi.fn(),
      handleSwitch: vi.fn(),
      handleDelete: vi.fn(),
      handleShow: vi.fn(),
      handleEdit: vi.fn()
    } as any

    mockProgram = program as any
    mockFs = await vi.importMock('fs-extra')
    
    vi.clearAllMocks()
    
    cliApp = new CliApplication(mockCommandHandler)
  })

  describe('setupCommands()', () => {
    it('package.jsonからバージョンを読み取りプログラムを設定', () => {
      const packageJson = { version: '1.0.0' }
      mockFs.readJsonSync.mockReturnValue(packageJson)

      cliApp.setupCommands()

      expect(mockFs.readJsonSync).toHaveBeenCalledWith(expect.stringContaining('package.json'))
      expect(mockProgram.name).toHaveBeenCalledWith('hostswitch')
      expect(mockProgram.description).toHaveBeenCalledWith('Simple hosts file switcher')
      expect(mockProgram.version).toHaveBeenCalledWith('1.0.0')
    })

    it('全てのコマンドを適切に設定', () => {
      const packageJson = { version: '1.0.0' }
      mockFs.readJsonSync.mockReturnValue(packageJson)

      cliApp.setupCommands()

      // listコマンドの設定を確認
      expect(mockProgram.command).toHaveBeenCalledWith('list')
      expect(mockProgram.alias).toHaveBeenCalledWith('ls')
      
      // createコマンドの設定を確認
      expect(mockProgram.command).toHaveBeenCalledWith('create <name>')
      expect(mockProgram.option).toHaveBeenCalledWith('-c, --from-current', 'Create from current hosts file')
      
      // switchコマンドの設定を確認
      expect(mockProgram.command).toHaveBeenCalledWith('switch <name>')
      expect(mockProgram.alias).toHaveBeenCalledWith('use')
      
      // deleteコマンドの設定を確認
      expect(mockProgram.command).toHaveBeenCalledWith('delete <name>')
      expect(mockProgram.alias).toHaveBeenCalledWith('rm')
      
      // showコマンドの設定を確認
      expect(mockProgram.command).toHaveBeenCalledWith('show <name>')
      expect(mockProgram.alias).toHaveBeenCalledWith('cat')
      
      // editコマンドの設定を確認
      expect(mockProgram.command).toHaveBeenCalledWith('edit <name>')
    })

    it('各コマンドに適切な説明を設定', () => {
      const packageJson = { version: '1.0.0' }
      mockFs.readJsonSync.mockReturnValue(packageJson)

      cliApp.setupCommands()

      const descriptions = mockProgram.description.mock.calls.map((call: any) => call[0])
      
      expect(descriptions).toContain('List all profiles')
      expect(descriptions).toContain('Create a new profile')
      expect(descriptions).toContain('Switch to a profile (requires sudo)')
      expect(descriptions).toContain('Delete a profile')
      expect(descriptions).toContain('Show profile content')
      expect(descriptions).toContain('Edit a profile')
    })
  })

  describe('run()', () => {
    it('program.parseを呼び出してコマンドライン引数を処理', () => {
      cliApp.run()

      expect(mockProgram.parse).toHaveBeenCalledWith(process.argv)
    })
  })

  describe('コマンドアクション', () => {
    beforeEach(() => {
      const packageJson = { version: '1.0.0' }
      mockFs.readJsonSync.mockReturnValue(packageJson)
      cliApp.setupCommands()
    })

    it('listコマンドのアクションが正しく設定される', () => {
      // actionの呼び出しを確認するため、actionコールの引数を取得
      const actionCalls = mockProgram.action.mock.calls
      const listActionCall = actionCalls.find((_call: any, index: number) => {
        // listコマンドに対応するactionを特定
        const commandCalls = mockProgram.command.mock.calls
        return commandCalls[index] && commandCalls[index][0] === 'list'
      })

      expect(listActionCall).toBeDefined()
      expect(listActionCall[0]).toBeInstanceOf(Function)
    })

    it('createコマンドのアクションが正しく設定される', () => {
      const actionCalls = mockProgram.action.mock.calls
      const createActionCall = actionCalls.find((_call: any, index: number) => {
        const commandCalls = mockProgram.command.mock.calls
        return commandCalls[index] && commandCalls[index][0] === 'create <name>'
      })

      expect(createActionCall).toBeDefined()
      expect(createActionCall[0]).toBeInstanceOf(Function)
    })
  })

  describe('エラーハンドリング', () => {
    it('package.json読み取りエラーが発生した場合は例外を投げる', () => {
      mockFs.readJsonSync.mockImplementation(() => {
        throw new Error('Cannot read package.json')
      })

      expect(() => cliApp.setupCommands()).toThrow('Cannot read package.json')
    })
  })
})