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
    } as any;

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
    it('should extract profile name correctly from various sudo command formats', async () => {
      vi.mocked(mockFacade.switchProfileWithSudo).mockResolvedValue({
        success: true,
        message: 'Success',
      });

      // Test standard format
      const result1: ICommandResult = {
        success: false,
        requiresSudo: true,
        sudoCommand: 'sudo hostswitch switch production',
      };

      await interactiveUI.handleCommandResult(result1);
      expect(mockFacade.switchProfileWithSudo).toHaveBeenCalledWith('production');

      // Test with full path
      const result2: ICommandResult = {
        success: false,
        requiresSudo: true,
        sudoCommand: 'sudo /usr/local/bin/hostswitch switch development',
      };

      await interactiveUI.handleCommandResult(result2);
      expect(mockFacade.switchProfileWithSudo).toHaveBeenCalledWith('development');

      // Test with node command
      const result3: ICommandResult = {
        success: false,
        requiresSudo: true,
        sudoCommand: 'sudo node /path/to/hostswitch.js switch staging',
      };

      await interactiveUI.handleCommandResult(result3);
      expect(mockFacade.switchProfileWithSudo).toHaveBeenCalledWith('staging');
    });

    it('should not execute sudo for non-switch commands', async () => {
      const commands = [
        'sudo hostswitch list',
        'sudo hostswitch create test',
        'sudo hostswitch delete test',
        'sudo hostswitch show test',
        'sudo hostswitch edit test',
      ];

      for (const command of commands) {
        const result: ICommandResult = {
          success: false,
          requiresSudo: true,
          sudoCommand: command,
        };

        await interactiveUI.handleCommandResult(result);
      }

      expect(mockFacade.switchProfileWithSudo).not.toHaveBeenCalled();
    });

    it('should handle malformed sudo commands gracefully', async () => {
      const malformedCommands = [
        'sudo',
        'sudo hostswitch',
        'sudo hostswitch switch',
        '',
        'malformed command',
      ];

      for (const command of malformedCommands) {
        const result: ICommandResult = {
          success: false,
          requiresSudo: true,
          sudoCommand: command,
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
    it('should handle undefined sudoCommand', async () => {
      const result: ICommandResult = {
        success: false,
        requiresSudo: true,
        // sudoCommand is undefined
      };

      await cliUI.handleCommandResult(result);
      await interactiveUI.handleCommandResult(result);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'This operation requires sudo privileges. Rerunning with sudo...'
      );
      expect(mockLogger.info).toHaveBeenCalledWith('(Skipped in test environment)');
      expect(mockLogger.warning).toHaveBeenCalledWith('This operation requires sudo privileges.');
    });

    it('should handle empty sudoCommand', async () => {
      const result: ICommandResult = {
        success: false,
        requiresSudo: true,
        sudoCommand: '',
      };

      await interactiveUI.handleCommandResult(result);

      expect(mockLogger.warning).toHaveBeenCalledWith('This operation requires sudo privileges.');
      expect(mockFacade.switchProfileWithSudo).not.toHaveBeenCalled();
    });
  });
});
