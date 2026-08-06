import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ICommandResult, ILogger } from '../../../interfaces';
import type { HostSwitchFacade } from '../../HostSwitchFacade';
import { CliUserInterface } from '../CliUserInterface';
import { InteractiveUserInterface } from '../InteractiveUserInterface';

describe('Auto-Sudo Functionality', () => {
  let mockLogger: ILogger;
  let mockFacade: HostSwitchFacade;
  let cliUI: CliUserInterface;
  let interactiveUI: InteractiveUserInterface;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      dim: vi.fn(),
      bold: vi.fn(),
    };

    mockFacade = {
      switchProfileWithSudo: vi.fn(),
    } as Pick<HostSwitchFacade, 'switchProfileWithSudo'>;

    cliUI = new CliUserInterface(mockLogger);
    interactiveUI = new InteractiveUserInterface(mockFacade, mockLogger);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('CliUserInterface Auto-Sudo', () => {
    it('should detect sudo requirement and skip in test environment', async () => {
      const result: ICommandResult = {
        success: false,
        requiresSudo: true,
        sudoCommand: 'sudo hostswitch switch my-profile',
        sudoArgs: ['switch', 'my-profile'],
      };

      await cliUI.handleCommandResult(result);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'This operation requires sudo privileges. Rerunning with sudo...'
      );
      expect(mockLogger.info).toHaveBeenCalledWith('(Skipped in test environment)');
    });

    it('should respect NODE_ENV=test environment', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      const mockExecSync = vi.fn();
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

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
      expect(mockLogger.info).toHaveBeenCalledWith('(Skipped in test environment)');
      expect(mockExecSync).not.toHaveBeenCalled();
      expect(mockExit).not.toHaveBeenCalled();

      // Restore
      if (originalNodeEnv !== undefined) {
        process.env.NODE_ENV = originalNodeEnv;
      } else {
        delete process.env.NODE_ENV;
      }
      mockExit.mockRestore();
    });
  });

  describe('InteractiveUserInterface Auto-Sudo', () => {
    it('should take the profile name from sudoArgs', async () => {
      vi.mocked(mockFacade.switchProfileWithSudo).mockResolvedValue({
        success: true,
        message: 'Success',
      });

      const result: ICommandResult = {
        success: false,
        requiresSudo: true,
        sudoCommand: 'sudo hostswitch switch production',
        sudoArgs: ['switch', 'production'],
      };

      await interactiveUI.handleCommandResult(result);

      expect(mockFacade.switchProfileWithSudo).toHaveBeenCalledWith('production');
    });

    it('should not run the profile name through the displayed sudoCommand', async () => {
      vi.mocked(mockFacade.switchProfileWithSudo).mockResolvedValue({
        success: true,
        message: 'Success',
      });

      // 表示用の文字列は絶対パスでも node 経由でも形が変わるので、判断材料にしない
      const result: ICommandResult = {
        success: false,
        requiresSudo: true,
        sudoCommand: 'sudo node /path/to/hostswitch.js switch staging',
        sudoArgs: ['switch', 'production'],
      };

      await interactiveUI.handleCommandResult(result);

      expect(mockFacade.switchProfileWithSudo).toHaveBeenCalledWith('production');
    });

    it('should not execute sudo for non-switch commands', async () => {
      const argsList = [
        ['list'],
        ['create', 'test'],
        ['delete', 'test'],
        ['show', 'test'],
        ['edit', 'test'],
      ];

      for (const sudoArgs of argsList) {
        const result: ICommandResult = {
          success: false,
          requiresSudo: true,
          sudoArgs,
        };

        await interactiveUI.handleCommandResult(result);
      }

      expect(mockFacade.switchProfileWithSudo).not.toHaveBeenCalled();
    });

    it('should handle incomplete sudoArgs gracefully', async () => {
      const argsList: (string[] | undefined)[] = [undefined, [], ['switch'], ['switch', '']];

      for (const sudoArgs of argsList) {
        const result: ICommandResult = {
          success: false,
          requiresSudo: true,
          sudoArgs,
        };

        await interactiveUI.handleCommandResult(result);
      }

      expect(mockFacade.switchProfileWithSudo).not.toHaveBeenCalled();
    });

    it('should handle switchProfileWithSudo rejection', async () => {
      vi.mocked(mockFacade.switchProfileWithSudo).mockRejectedValue(new Error('Network error'));

      const result: ICommandResult = {
        success: false,
        requiresSudo: true,
        sudoCommand: 'sudo hostswitch switch production',
        sudoArgs: ['switch', 'production'],
      };

      // This should not throw
      await interactiveUI.handleCommandResult(result);

      expect(mockLogger.warning).toHaveBeenCalledWith('This operation requires sudo privileges.');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Switching to profile "production" with sudo...'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to execute sudo command: Network error'
      );
    });
  });

  describe('Edge Cases', () => {
    it('should report a missing sudoArgs instead of replaying the current command', async () => {
      const result: ICommandResult = {
        success: false,
        requiresSudo: true,
        // sudoArgs is undefined
      };

      await cliUI.handleCommandResult(result);
      await interactiveUI.handleCommandResult(result);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'This operation requires sudo privileges. Rerunning with sudo...'
      );
      expect(mockLogger.error).toHaveBeenCalledWith('No sudo command provided');
      expect(mockLogger.info).not.toHaveBeenCalledWith('(Skipped in test environment)');
      expect(mockLogger.warning).toHaveBeenCalledWith('This operation requires sudo privileges.');
      expect(mockFacade.switchProfileWithSudo).not.toHaveBeenCalled();
    });

    it('should handle empty sudoArgs', async () => {
      const result: ICommandResult = {
        success: false,
        requiresSudo: true,
        sudoArgs: [],
      };

      await interactiveUI.handleCommandResult(result);

      expect(mockLogger.warning).toHaveBeenCalledWith('This operation requires sudo privileges.');
      expect(mockFacade.switchProfileWithSudo).not.toHaveBeenCalled();
    });
  });
});
