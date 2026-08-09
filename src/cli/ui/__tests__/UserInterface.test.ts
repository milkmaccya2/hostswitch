import inquirer from 'inquirer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ICommandResult, ILogger } from '../../../interfaces';
import type { HostSwitchFacade } from '../../HostSwitchFacade';
import { CliUserInterface } from '../CliUserInterface';
import { InteractiveUserInterface } from '../InteractiveUserInterface';

vi.mock('inquirer');

describe('User Interface Classes', () => {
  let mockFacade: HostSwitchFacade;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockFacade = {
      listProfiles: vi.fn(),
      createProfile: vi.fn(),
      switchProfile: vi.fn(),
      editProfile: vi.fn(),
      showProfile: vi.fn(),
      deleteProfile: vi.fn(),
      elevate: vi.fn(),
      getCurrentProfile: vi.fn(),
      getDeletableProfiles: vi.fn(),
      validateProfileNameInput: vi.fn().mockReturnValue(true),
    } as unknown as HostSwitchFacade;

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      dim: vi.fn(),
      bold: vi.fn(),
      debug: vi.fn(),
    };

    vi.clearAllMocks();
  });

  describe('CliUserInterface', () => {
    let cliUI: CliUserInterface;
    let mockElevate: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockElevate = vi.fn().mockResolvedValue({ success: true, message: 'Completed successfully' });
      cliUI = new CliUserInterface(mockLogger, mockElevate);
    });

    describe('showMessage', () => {
      it('should call appropriate logger method for each message type', () => {
        cliUI.showMessage('Info message', 'info');
        cliUI.showMessage('Error message', 'error');
        cliUI.showMessage('Success message', 'success');
        cliUI.showMessage('Warning message', 'warning');

        expect(mockLogger.info).toHaveBeenCalledWith('Info message');
        expect(mockLogger.error).toHaveBeenCalledWith('Error message');
        expect(mockLogger.success).toHaveBeenCalledWith('Success message');
        expect(mockLogger.warning).toHaveBeenCalledWith('Warning message');
      });

      it('should default to info type', () => {
        cliUI.showMessage('Default message');
        expect(mockLogger.info).toHaveBeenCalledWith('Default message');
      });
    });

    describe('interactive methods', () => {
      it('TTY が無ければ promptConfirm はエラー（--force を促す）', async () => {
        await expect(cliUI.promptConfirm('Confirm?')).rejects.toThrow('--force');
      });

      it('should throw error for promptSelect', async () => {
        await expect(cliUI.promptSelect('Select:', [{ name: 'A', value: 'a' }])).rejects.toThrow(
          'not supported in CLI mode'
        );
      });

      it('should throw error for promptInput', async () => {
        await expect(cliUI.promptInput('Input:')).rejects.toThrow('not supported in CLI mode');
      });
    });

    describe('handleCommandResult', () => {
      it('should handle successful result', async () => {
        const result: ICommandResult = {
          success: true,
          message: 'Operation successful',
        };

        await cliUI.handleCommandResult(result);

        expect(mockLogger.success).toHaveBeenCalledWith('Operation successful');
      });

      it('should handle failed result and exit', async () => {
        const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
        const result: ICommandResult = {
          success: false,
          message: 'Operation failed',
        };

        await cliUI.handleCommandResult(result);

        expect(mockLogger.error).toHaveBeenCalledWith('Operation failed');
        expect(mockExit).toHaveBeenCalledWith(1);

        mockExit.mockRestore();
      });

      it('should handle sudo requirement by auto-executing in test environment', async () => {
        const result: ICommandResult = {
          success: false,
          requiresSudo: true,
          sudoCommand: 'sudo hostswitch switch staging',
          sudoArgs: ['switch', 'staging'],
        };

        await cliUI.handleCommandResult(result);

        expect(mockLogger.info).toHaveBeenCalledWith(
          'This operation requires sudo privileges. Rerunning with sudo...'
        );
        expect(mockElevate).toHaveBeenCalled();
      });

      it('should handle confirmation requirement', async () => {
        const result: ICommandResult = {
          success: false,
          requiresConfirmation: true,
        };

        await cliUI.handleCommandResult(result);

        expect(mockLogger.warning).toHaveBeenCalledWith(
          'This operation requires confirmation. Add --force flag to proceed without confirmation.'
        );
      });

      it('should hint the switch command when the edited profile needs applying', async () => {
        const result: ICommandResult = {
          success: true,
          message: 'Profile "nothing" edited successfully',
          requiresApply: true,
          profileName: 'nothing',
        };

        await cliUI.handleCommandResult(result);

        expect(mockLogger.warning).toHaveBeenCalledWith(
          'Run `hostswitch switch nothing` to apply to /etc/hosts.'
        );
      });
    });

    describe('displayData', () => {
      it('プロファイル一覧を current 付きで表示する', async () => {
        await cliUI.handleCommandResult({
          success: true,
          data: {
            profiles: [
              { name: 'dev', isCurrent: true },
              { name: 'stg', isCurrent: false },
            ],
          },
        });

        expect(mockLogger.info).toHaveBeenCalledWith('  dev (current)');
        expect(mockLogger.info).toHaveBeenCalledWith('  stg');
      });

      it('プロファイルが空なら No profiles found', async () => {
        await cliUI.handleCommandResult({ success: true, data: { profiles: [] } });

        expect(mockLogger.info).toHaveBeenCalledWith('No profiles found');
      });

      it('バックアップ一覧を日時付きで表示する', async () => {
        await cliUI.handleCommandResult({
          success: true,
          data: {
            backups: [{ id: '2026-08-05T14-32-10-123Z', path: '/b', createdAt: new Date(0) }],
          },
        });

        expect(mockLogger.info).toHaveBeenCalledWith('Available backups (newest first):');
        const printed = vi
          .mocked(mockLogger.info)
          .mock.calls.map((c) => c[0])
          .join('\n');
        expect(printed).toContain('2026-08-05T14-32-10-123Z');
      });

      it('createdAt が null のバックアップは unknown time と表示する', async () => {
        await cliUI.handleCommandResult({
          success: true,
          data: { backups: [{ id: 'manual', path: '/b', createdAt: null }] },
        });

        const printed = vi
          .mocked(mockLogger.info)
          .mock.calls.map((c) => c[0])
          .join('\n');
        expect(printed).toContain('unknown time');
      });

      it('バックアップが空なら No backups found', async () => {
        await cliUI.handleCommandResult({ success: true, data: { backups: [] } });

        expect(mockLogger.info).toHaveBeenCalledWith('No backups found');
      });

      it('プロファイル内容をそのまま出力する', async () => {
        const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

        await cliUI.handleCommandResult({
          success: true,
          data: { content: '127.0.0.1 example.local' },
        });

        expect(spy).toHaveBeenCalledWith('127.0.0.1 example.local');
        spy.mockRestore();
      });
    });

    describe('displayStatus', () => {
      const baseStatus = {
        currentProfile: 'dev',
        hostsPath: '/etc/hosts',
        modified: false,
        updatedAt: null as string | null,
        latestBackup: null as { id: string; path: string; createdAt: Date | null } | null,
      };

      it('in sync の状態を表示する', async () => {
        await cliUI.handleCommandResult({ success: true, data: { status: baseStatus } });

        expect(mockLogger.info).toHaveBeenCalledWith('Current profile: dev');
        expect(mockLogger.info).toHaveBeenCalledWith('Status:          in sync');
      });

      it('current が無ければ no profile active', async () => {
        await cliUI.handleCommandResult({
          success: true,
          data: { status: { ...baseStatus, currentProfile: null } },
        });

        expect(mockLogger.info).toHaveBeenCalledWith('Current profile: (none)');
        expect(mockLogger.info).toHaveBeenCalledWith('Status:          no profile active');
      });

      it('modified なら警告とTipを出す', async () => {
        await cliUI.handleCommandResult({
          success: true,
          data: { status: { ...baseStatus, modified: true } },
        });

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Status:          modified outside hostswitch'
        );
        expect(mockLogger.warning).toHaveBeenCalledWith(expect.stringContaining('--from-current'));
      });

      it('updatedAt と latestBackup があれば表示する', async () => {
        await cliUI.handleCommandResult({
          success: true,
          data: {
            status: {
              ...baseStatus,
              updatedAt: '2026-08-05T14:32:10.000Z',
              latestBackup: { id: 'bk1', path: '/b', createdAt: new Date(0) },
            },
          },
        });

        const printed = vi
          .mocked(mockLogger.info)
          .mock.calls.map((c) => c[0])
          .join('\n');
        expect(printed).toContain('Last switched:');
        expect(printed).toContain('Latest backup:   bk1');
      });
    });
  });

  describe('InteractiveUserInterface', () => {
    let interactiveUI: InteractiveUserInterface;

    beforeEach(() => {
      interactiveUI = new InteractiveUserInterface(mockFacade, mockLogger);
      // run() はメニューが 'exit' を返すまで回り続ける。モックを積み忘れると
      // 無限ループ→OOM でプロセスごと落ちるため、既定値を 'exit' にしておく。
      // 各テストは mockResolvedValueOnce を積み、消費し切ると自動で抜ける（#106）
      vi.mocked(inquirer.prompt).mockResolvedValue({ selected: 'exit' });
    });

    describe('showMessage', () => {
      it('should call appropriate logger method', () => {
        interactiveUI.showMessage('Test message', 'success');
        expect(mockLogger.success).toHaveBeenCalledWith('Test message');
      });
    });

    describe('promptConfirm', () => {
      it('should return inquirer result', async () => {
        vi.mocked(inquirer.prompt).mockResolvedValue({ confirmed: true });

        const result = await interactiveUI.promptConfirm('Are you sure?');

        expect(result).toBe(true);
        expect(inquirer.prompt).toHaveBeenCalledWith([
          {
            type: 'confirm',
            name: 'confirmed',
            message: 'Are you sure?',
            default: false,
          },
        ]);
      });
    });

    describe('promptSelect', () => {
      it('should return selected value', async () => {
        vi.mocked(inquirer.prompt).mockResolvedValue({ selected: 'option1' });

        const choices = [
          { name: 'Option 1', value: 'option1' },
          { name: 'Option 2', value: 'option2' },
        ];

        const result = await interactiveUI.promptSelect('Choose:', choices);

        expect(result).toBe('option1');
        expect(inquirer.prompt).toHaveBeenCalledWith([
          {
            type: 'list',
            name: 'selected',
            message: 'Choose:',
            choices,
          },
        ]);
      });
    });

    describe('run() - edit', () => {
      const profiles = [
        { name: 'nothing', isCurrent: true },
        { name: 'dev', isCurrent: false },
      ];

      beforeEach(() => {
        vi.mocked(mockFacade.getCurrentProfile).mockReturnValue('nothing');
        vi.mocked(mockFacade.listProfiles).mockResolvedValue({
          success: true,
          data: { profiles },
        });
      });

      it('current プロファイルを編集して未適用なら確認して適用する', async () => {
        vi.mocked(mockFacade.editProfile).mockResolvedValue({
          success: true,
          message: 'Profile "nothing" edited successfully',
          requiresApply: true,
          profileName: 'nothing',
        });
        vi.mocked(mockFacade.switchProfile).mockResolvedValue({
          success: true,
          message: 'Switched to profile "nothing"',
        });
        vi.mocked(inquirer.prompt)
          .mockResolvedValueOnce({ selected: 'edit' })
          .mockResolvedValueOnce({ selected: 'nothing' })
          .mockResolvedValueOnce({ confirmed: true });

        await interactiveUI.run();

        expect(mockFacade.switchProfile).toHaveBeenCalledWith('nothing');
      });

      it('確認で拒否した場合は適用せずswitchコマンドを案内する', async () => {
        vi.mocked(mockFacade.editProfile).mockResolvedValue({
          success: true,
          message: 'Profile "nothing" edited successfully',
          requiresApply: true,
          profileName: 'nothing',
        });
        vi.mocked(inquirer.prompt)
          .mockResolvedValueOnce({ selected: 'edit' })
          .mockResolvedValueOnce({ selected: 'nothing' })
          .mockResolvedValueOnce({ confirmed: false });

        await interactiveUI.run();

        expect(mockFacade.switchProfile).not.toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith('Run `hostswitch switch nothing` to apply.');
      });

      it('requiresApplyが無ければ確認しない', async () => {
        vi.mocked(mockFacade.editProfile).mockResolvedValue({
          success: true,
          message: 'Profile "dev" edited successfully',
        });
        vi.mocked(inquirer.prompt)
          .mockResolvedValueOnce({ selected: 'edit' })
          .mockResolvedValueOnce({ selected: 'dev' });

        await interactiveUI.run();

        // edit(2) の後もメニューに戻り、既定の exit で抜ける(3回目)
        expect(inquirer.prompt).toHaveBeenCalledTimes(3);
        expect(mockFacade.switchProfile).not.toHaveBeenCalled();
      });
    });

    describe('run() - switch', () => {
      it('切替先の一覧に current を re-apply として残す', async () => {
        vi.mocked(mockFacade.getCurrentProfile).mockReturnValue('nothing');
        vi.mocked(mockFacade.listProfiles).mockResolvedValue({
          success: true,
          data: {
            profiles: [
              { name: 'nothing', isCurrent: true },
              { name: 'dev', isCurrent: false },
            ],
          },
        });
        vi.mocked(mockFacade.switchProfile).mockResolvedValue({
          success: true,
          message: 'Switched to profile "nothing"',
        });
        vi.mocked(inquirer.prompt)
          .mockResolvedValueOnce({ selected: 'switch' })
          .mockResolvedValueOnce({ selected: 'nothing' });

        await interactiveUI.run();

        const selectCall = vi.mocked(inquirer.prompt).mock.calls[1][0] as Array<{
          choices: Array<{ name: string; value: string }>;
        }>;
        expect(selectCall[0].choices).toEqual([
          { name: 'nothing (current, re-apply)', value: 'nothing' },
          { name: 'dev', value: 'dev' },
        ]);
        expect(mockFacade.switchProfile).toHaveBeenCalledWith('nothing');
      });
    });

    describe('promptInput', () => {
      it('should return input value', async () => {
        vi.mocked(inquirer.prompt).mockResolvedValue({ input: 'test-input' });

        const result = await interactiveUI.promptInput('Enter name:');

        expect(result).toBe('test-input');
        expect(inquirer.prompt).toHaveBeenCalledWith([
          {
            type: 'input',
            name: 'input',
            message: 'Enter name:',
            validate: undefined,
          },
        ]);
      });

      it('should pass validator function', async () => {
        vi.mocked(inquirer.prompt).mockResolvedValue({ input: 'valid-input' });
        const validator = vi.fn().mockReturnValue(true);

        await interactiveUI.promptInput('Enter name:', validator);

        const call = vi.mocked(inquirer.prompt).mock.calls[0][0] as inquirer.QuestionCollection;
        if (Array.isArray(call)) {
          expect((call[0] as inquirer.InputQuestion).validate).toBe(validator);
        }
      });
    });

    describe('handleCommandResult', () => {
      it('should show success message', async () => {
        const result: ICommandResult = {
          success: true,
          message: 'Success!',
        };

        await interactiveUI.handleCommandResult(result);

        expect(mockLogger.success).toHaveBeenCalledWith('Success!');
      });

      it('should show error message for failed result', async () => {
        const result: ICommandResult = {
          success: false,
          message: 'Failed!',
        };

        await interactiveUI.handleCommandResult(result);

        expect(mockLogger.error).toHaveBeenCalledWith('Failed!');
      });

      it('should handle confirmation requirement', async () => {
        vi.mocked(inquirer.prompt).mockResolvedValue({ confirmed: false });

        const result: ICommandResult = {
          success: true,
          requiresConfirmation: true,
          message: 'Delete profile',
        };

        await interactiveUI.handleCommandResult(result);

        expect(mockLogger.info).toHaveBeenCalledWith('Operation cancelled');
      });

      it('should handle sudo requirement by auto-executing with facade', async () => {
        vi.mocked(mockFacade.elevate).mockResolvedValue({
          success: true,
          message: 'Switched to profile "staging"',
        });

        const result: ICommandResult = {
          success: false,
          requiresSudo: true,
          sudoCommand: 'sudo hostswitch switch staging',
          sudoArgs: ['switch', 'staging'],
        };

        await interactiveUI.handleCommandResult(result);

        expect(mockLogger.warning).toHaveBeenCalledWith('This operation requires sudo privileges.');
        expect(mockLogger.info).toHaveBeenCalledWith('Rerunning `switch staging` with sudo...');
        expect(mockFacade.elevate).toHaveBeenCalledWith(['switch', 'staging']);
        expect(mockLogger.success).toHaveBeenCalledWith('Switched to profile "staging"');
      });

      it('構造的に壊れた sudoArgs では昇格しない', async () => {
        // 何を sudo で実行するかを決めるのは Facade。UI は
        // 空・空文字を含むといった壊れた値だけを弾く
        for (const sudoArgs of [undefined, [], ['switch', '']]) {
          await interactiveUI.handleCommandResult({
            success: false,
            requiresSudo: true,
            sudoArgs,
          });
        }

        expect(mockFacade.elevate).not.toHaveBeenCalled();
        expect(mockLogger.error).toHaveBeenCalledWith('No sudo command provided');
      });

      it('sudoArgs をそのまま昇格に渡す', async () => {
        vi.mocked(mockFacade.elevate).mockResolvedValue({ success: true, message: 'ok' });

        await interactiveUI.handleCommandResult({
          success: false,
          requiresSudo: true,
          sudoArgs: ['switch', 'staging'],
        });

        expect(mockFacade.elevate).toHaveBeenCalledWith(['switch', 'staging']);
      });

      it('should handle sudo execution failure in interactive mode', async () => {
        vi.mocked(mockFacade.elevate).mockResolvedValue({
          success: false,
          message: 'Sudo execution failed',
        });

        const result: ICommandResult = {
          success: false,
          requiresSudo: true,
          sudoCommand: 'sudo hostswitch switch staging',
          sudoArgs: ['switch', 'staging'],
        };

        await interactiveUI.handleCommandResult(result);

        expect(mockLogger.warning).toHaveBeenCalledWith('This operation requires sudo privileges.');
        expect(mockLogger.info).toHaveBeenCalledWith('Rerunning `switch staging` with sudo...');
        expect(mockFacade.elevate).toHaveBeenCalledWith(['switch', 'staging']);
        expect(mockLogger.error).toHaveBeenCalledWith('Sudo execution failed');
      });

      it('should pass profile names containing spaces through untouched', async () => {
        vi.mocked(mockFacade.elevate).mockResolvedValue({
          success: true,
          message: 'Switched successfully',
        });

        const result: ICommandResult = {
          success: false,
          requiresSudo: true,
          sudoCommand: 'sudo hostswitch switch complex profile name',
          sudoArgs: ['switch', 'complex profile name'],
        };

        await interactiveUI.handleCommandResult(result);

        expect(mockFacade.elevate).toHaveBeenCalledWith(['switch', 'complex profile name']);
      });
    });

    describe('run() - メニュー継続（#87）', () => {
      it('list の後もメニューに戻る（1操作で終了しない）', async () => {
        vi.mocked(mockFacade.listProfiles).mockResolvedValue({
          success: true,
          data: { profiles: [{ name: 'dev', isCurrent: false }] },
        });
        // list → メニュー(既定 exit)。list が実行され、その後メニューに戻る
        vi.mocked(inquirer.prompt).mockResolvedValueOnce({ selected: 'list' });

        await interactiveUI.run();

        expect(mockFacade.listProfiles).toHaveBeenCalled();
        // list(1) の後、既定の exit を引くメニュー(2)が出る = 1操作で終了していない
        expect(inquirer.prompt).toHaveBeenCalledTimes(2);
      });
    });

    describe('run() - delete（#87）', () => {
      it('確認して Yes なら force=true で削除する', async () => {
        // 以前は force を渡さず、確認したのに削除されないバグがあった
        vi.mocked(mockFacade.getDeletableProfiles).mockReturnValue([
          { name: 'dev', isCurrent: false },
        ]);
        vi.mocked(mockFacade.deleteProfile).mockResolvedValue({
          success: true,
          message: 'Profile "dev" deleted successfully',
        });
        vi.mocked(inquirer.prompt)
          .mockResolvedValueOnce({ selected: 'delete' })
          .mockResolvedValueOnce({ selected: 'dev' })
          .mockResolvedValueOnce({ confirmed: true });

        await interactiveUI.run();

        expect(mockFacade.deleteProfile).toHaveBeenCalledWith('dev', true);
      });

      it('確認で No なら削除しない', async () => {
        vi.mocked(mockFacade.getDeletableProfiles).mockReturnValue([
          { name: 'dev', isCurrent: false },
        ]);
        vi.mocked(inquirer.prompt)
          .mockResolvedValueOnce({ selected: 'delete' })
          .mockResolvedValueOnce({ selected: 'dev' })
          .mockResolvedValueOnce({ confirmed: false });

        await interactiveUI.run();

        expect(mockFacade.deleteProfile).not.toHaveBeenCalled();
      });
    });

    describe('run() - show', () => {
      it('選んだプロファイルの内容を表示する', async () => {
        vi.mocked(mockFacade.listProfiles).mockResolvedValue({
          success: true,
          data: { profiles: [{ name: 'dev', isCurrent: false }] },
        });
        vi.mocked(mockFacade.showProfile).mockResolvedValue({
          success: true,
          data: { content: '127.0.0.1 dev.local' },
        });
        vi.mocked(inquirer.prompt)
          .mockResolvedValueOnce({ selected: 'show' })
          .mockResolvedValueOnce({ selected: 'dev' })
          // show の後の「Press Enter to continue」
          .mockResolvedValueOnce({ input: '' });

        await interactiveUI.run();

        expect(mockFacade.showProfile).toHaveBeenCalledWith('dev');
        expect(mockLogger.info).toHaveBeenCalledWith('127.0.0.1 dev.local');
      });

      it('プロファイルが無ければ警告して何もしない', async () => {
        vi.mocked(mockFacade.listProfiles).mockResolvedValue({
          success: true,
          data: { profiles: [] },
        });
        vi.mocked(inquirer.prompt).mockResolvedValueOnce({ selected: 'show' });

        await interactiveUI.run();

        expect(mockLogger.warning).toHaveBeenCalledWith('No profiles available to show');
        expect(mockFacade.showProfile).not.toHaveBeenCalled();
      });
    });

    describe('run() - create', () => {
      it('名前を入力し from-current を確認して作成する', async () => {
        vi.mocked(mockFacade.validateProfileNameInput).mockReturnValue(true);
        vi.mocked(mockFacade.createProfile).mockResolvedValue({ success: true });
        vi.mocked(inquirer.prompt)
          .mockResolvedValueOnce({ selected: 'create' })
          .mockResolvedValueOnce({ input: 'newone' })
          .mockResolvedValueOnce({ confirmed: true });

        await interactiveUI.run();

        expect(mockFacade.createProfile).toHaveBeenCalledWith('newone', true);
      });
    });

    describe('run() - edit の早期リターン', () => {
      it('プロファイルが無ければ警告して何もしない', async () => {
        vi.mocked(mockFacade.listProfiles).mockResolvedValue({
          success: true,
          data: { profiles: [] },
        });
        vi.mocked(inquirer.prompt).mockResolvedValueOnce({ selected: 'edit' });

        await interactiveUI.run();

        expect(mockLogger.warning).toHaveBeenCalledWith('No profiles available to edit');
        expect(mockFacade.editProfile).not.toHaveBeenCalled();
      });
    });

    describe('run() - delete の早期リターン', () => {
      it('削除可能なプロファイルが無ければ警告して何もしない', async () => {
        vi.mocked(mockFacade.getDeletableProfiles).mockReturnValue([]);
        vi.mocked(inquirer.prompt).mockResolvedValueOnce({ selected: 'delete' });

        await interactiveUI.run();

        expect(mockLogger.warning).toHaveBeenCalledWith('No profiles available for deletion');
        expect(mockFacade.deleteProfile).not.toHaveBeenCalled();
      });
    });
  });
});
