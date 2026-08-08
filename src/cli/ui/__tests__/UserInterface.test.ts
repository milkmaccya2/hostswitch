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
      it('should throw error for promptConfirm', async () => {
        await expect(cliUI.promptConfirm('Confirm?')).rejects.toThrow('not supported in CLI mode');
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
  });

  describe('InteractiveUserInterface', () => {
    let interactiveUI: InteractiveUserInterface;

    beforeEach(() => {
      interactiveUI = new InteractiveUserInterface(mockFacade, mockLogger);
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

        expect(inquirer.prompt).toHaveBeenCalledTimes(2);
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
  });
});
