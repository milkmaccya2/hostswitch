import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InteractiveUserInterface } from '../InteractiveUserInterface';
import { CliUserInterface } from '../CliUserInterface';
import { HostSwitchFacade } from '../../HostSwitchFacade';
import { ILogger, ICommandResult } from '../../../interfaces';
import inquirer from 'inquirer';

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
      switchProfileWithSudo: vi.fn(),
      getCurrentProfile: vi.fn(),
      getDeletableProfiles: vi.fn(),
    } as any;

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      dim: vi.fn(),
      bold: vi.fn(),
    };

    vi.clearAllMocks();
  });

  describe('CliUserInterface', () => {
    let cliUI: CliUserInterface;

    beforeEach(() => {
      cliUI = new CliUserInterface(mockLogger);
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
        await expect(cliUI.promptSelect('Select:', [{ name: 'A', value: 'a' }])).rejects.toThrow('not supported in CLI mode');
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

      it('should handle sudo requirement', async () => {
        const result: ICommandResult = {
          success: false,
          requiresSudo: true,
          sudoCommand: 'sudo hostswitch switch staging',
        };

        await cliUI.handleCommandResult(result);

        expect(mockLogger.warning).toHaveBeenCalledWith('This operation requires sudo privileges.');
        expect(mockLogger.info).toHaveBeenCalledWith('Please run: sudo hostswitch switch staging');
      });

      it('should handle confirmation requirement', async () => {
        const result: ICommandResult = {
          success: false,
          requiresConfirmation: true,
        };

        await cliUI.handleCommandResult(result);

        expect(mockLogger.warning).toHaveBeenCalledWith('This operation requires confirmation. Add --force flag to proceed without confirmation.');
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

        const call = vi.mocked(inquirer.prompt).mock.calls[0][0] as any;
        expect(call[0].validate).toBe(validator);
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

      it('should handle sudo requirement', async () => {
        vi.mocked(inquirer.prompt).mockResolvedValue({ confirmed: false });

        const result: ICommandResult = {
          success: false,
          requiresSudo: true,
          sudoCommand: 'sudo hostswitch switch staging',
        };

        await interactiveUI.handleCommandResult(result);

        expect(mockLogger.warning).toHaveBeenCalledWith('This operation requires sudo privileges.');
        expect(mockLogger.info).toHaveBeenCalledWith('Please run the following command:');
        expect(mockLogger.info).toHaveBeenCalledWith('sudo hostswitch switch staging');
      });
    });
  });
});