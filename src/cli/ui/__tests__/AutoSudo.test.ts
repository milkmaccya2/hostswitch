import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ICommandResult, ILogger } from '../../../interfaces';
import type { HostSwitchFacade } from '../../HostSwitchFacade';
import { CliUserInterface } from '../CliUserInterface';
import { InteractiveUserInterface } from '../InteractiveUserInterface';

describe('Auto-Sudo Functionality', () => {
  let mockLogger: ILogger;
  let mockFacade: HostSwitchFacade;
  let cliUI: CliUserInterface;
  let mockElevate: ReturnType<typeof vi.fn>;
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
      debug: vi.fn(),
    };

    mockElevate = vi.fn().mockResolvedValue({ success: true, message: 'Completed successfully' });

    mockFacade = {
      elevate: vi.fn().mockResolvedValue({ success: true, message: 'Completed successfully' }),
    } as unknown as HostSwitchFacade;

    cliUI = new CliUserInterface(mockLogger, mockElevate);
    interactiveUI = new InteractiveUserInterface(mockFacade, mockLogger);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('CliUserInterface Auto-Sudo', () => {
    it('注入された昇格関数に sudoArgs をそのまま渡す', async () => {
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
      // 昇格の実装は1箇所に集約されており、UI は呼ぶだけ
      expect(mockElevate).toHaveBeenCalledWith(['switch', 'my-profile']);
    });

    it('昇格関数が渡されていなければ実行せず案内だけ出す', async () => {
      // テスト環境かどうかを本番コードで判定していたのをやめ、
      // 昇格手段の有無で決まるようにした
      const uiWithoutElevate = new CliUserInterface(mockLogger);
      const result: ICommandResult = {
        success: false,
        requiresSudo: true,
        sudoCommand: 'sudo hostswitch switch staging',
        sudoArgs: ['switch', 'staging'],
      };

      await uiWithoutElevate.handleCommandResult(result);

      expect(mockElevate).not.toHaveBeenCalled();
      expect(mockLogger.warning).toHaveBeenCalledWith(
        expect.stringContaining('sudo hostswitch switch staging')
      );
    });
  });

  describe('InteractiveUserInterface Auto-Sudo', () => {
    it('should take the profile name from sudoArgs', async () => {
      vi.mocked(mockFacade.elevate).mockResolvedValue({
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

      expect(mockFacade.elevate).toHaveBeenCalledWith(['switch', 'production']);
    });

    it('should not run the profile name through the displayed sudoCommand', async () => {
      vi.mocked(mockFacade.elevate).mockResolvedValue({
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

      expect(mockFacade.elevate).toHaveBeenCalledWith(['switch', 'production']);
    });

    it('sudoArgs をそのまま昇格に渡す（コマンドの選別は Facade の責務）', async () => {
      vi.mocked(mockFacade.elevate).mockResolvedValue({ success: true, message: 'ok' });

      await interactiveUI.handleCommandResult({
        success: false,
        requiresSudo: true,
        sudoArgs: ['switch', 'production'],
      });

      expect(mockFacade.elevate).toHaveBeenCalledWith(['switch', 'production']);
    });

    it('should handle incomplete sudoArgs gracefully', async () => {
      // 引数の個数が正しいかは Facade の責務。UI は構造的に壊れた値だけ弾く
      const argsList: (string[] | undefined)[] = [undefined, [], ['switch', '']];

      for (const sudoArgs of argsList) {
        const result: ICommandResult = {
          success: false,
          requiresSudo: true,
          sudoArgs,
        };

        await interactiveUI.handleCommandResult(result);
      }

      expect(mockFacade.elevate).not.toHaveBeenCalled();
    });

    it('should handle elevate rejection', async () => {
      vi.mocked(mockFacade.elevate).mockRejectedValue(new Error('Network error'));

      const result: ICommandResult = {
        success: false,
        requiresSudo: true,
        sudoCommand: 'sudo hostswitch switch production',
        sudoArgs: ['switch', 'production'],
      };

      // This should not throw
      await interactiveUI.handleCommandResult(result);

      expect(mockLogger.warning).toHaveBeenCalledWith('This operation requires sudo privileges.');
      expect(mockLogger.info).toHaveBeenCalledWith('Rerunning `switch production` with sudo...');
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

      // 現在の argv を流用して root 実行してしまわないこと
      expect(mockLogger.error).toHaveBeenCalledWith('No sudo command provided');
      expect(mockElevate).not.toHaveBeenCalled();
      expect(mockFacade.elevate).not.toHaveBeenCalled();
    });

    it('should handle empty sudoArgs', async () => {
      const result: ICommandResult = {
        success: false,
        requiresSudo: true,
        sudoArgs: [],
      };

      await interactiveUI.handleCommandResult(result);

      expect(mockLogger.warning).toHaveBeenCalledWith('This operation requires sudo privileges.');
      expect(mockFacade.elevate).not.toHaveBeenCalled();
    });
  });
});
