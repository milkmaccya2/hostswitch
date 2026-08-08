import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ICommandResult } from '../../../interfaces';
import type { HostSwitchFacade } from '../../HostSwitchFacade';
import { CreateProfileCommand } from '../CreateProfileCommand';
import { DeleteProfileCommand } from '../DeleteProfileCommand';
import { EditProfileCommand } from '../EditProfileCommand';
import { ListBackupsCommand } from '../ListBackupsCommand';
import { ListProfilesCommand } from '../ListProfilesCommand';
import { RestoreBackupCommand } from '../RestoreBackupCommand';
import { ShowProfileCommand } from '../ShowProfileCommand';
import { StatusCommand } from '../StatusCommand';
import { SwitchProfileCommand } from '../SwitchProfileCommand';

describe('Command Classes', () => {
  let mockFacade: Partial<HostSwitchFacade>;

  beforeEach(() => {
    mockFacade = {
      listProfiles: vi.fn(),
      createProfile: vi.fn(),
      switchProfile: vi.fn(),
      editProfile: vi.fn(),
      showProfile: vi.fn(),
      deleteProfile: vi.fn(),
      elevate: vi.fn(),
      listBackups: vi.fn(),
      restoreBackup: vi.fn(),
      getStatus: vi.fn(),
      getCurrentProfile: vi.fn(),
      getDeletableProfiles: vi.fn(),
    };
  });

  describe('ListProfilesCommand', () => {
    it('should execute listProfiles on facade', async () => {
      const expectedResult: ICommandResult = { success: true, data: { profiles: [] } };
      vi.mocked(mockFacade.listProfiles!).mockResolvedValue(expectedResult);

      const command = new ListProfilesCommand(mockFacade as HostSwitchFacade);
      const result = await command.execute();

      expect(result).toBe(expectedResult);
      expect(mockFacade.listProfiles).toHaveBeenCalledOnce();
    });
  });

  describe('CreateProfileCommand', () => {
    it('should execute createProfile with default fromCurrent=false', async () => {
      const expectedResult: ICommandResult = { success: true, message: 'Created' };
      vi.mocked(mockFacade.createProfile!).mockResolvedValue(expectedResult);

      const command = new CreateProfileCommand(mockFacade as HostSwitchFacade, 'test-profile');
      const result = await command.execute();

      expect(result).toBe(expectedResult);
      expect(mockFacade.createProfile).toHaveBeenCalledWith('test-profile', false);
    });

    it('should execute createProfile with fromCurrent=true', async () => {
      const expectedResult: ICommandResult = { success: true, message: 'Created' };
      vi.mocked(mockFacade.createProfile!).mockResolvedValue(expectedResult);

      const command = new CreateProfileCommand(
        mockFacade as HostSwitchFacade,
        'test-profile',
        true
      );
      const result = await command.execute();

      expect(result).toBe(expectedResult);
      expect(mockFacade.createProfile).toHaveBeenCalledWith('test-profile', true);
    });
  });

  describe('SwitchProfileCommand', () => {
    it('should execute switchProfile on facade', async () => {
      const expectedResult: ICommandResult = { success: true, message: 'Switched' };
      vi.mocked(mockFacade.switchProfile!).mockResolvedValue(expectedResult);

      const command = new SwitchProfileCommand(mockFacade as HostSwitchFacade, 'staging');
      const result = await command.execute();

      expect(result).toBe(expectedResult);
      expect(mockFacade.switchProfile).toHaveBeenCalledWith('staging', { flushDns: undefined });
    });
  });

  describe('EditProfileCommand', () => {
    it('should execute editProfile on facade', async () => {
      const expectedResult: ICommandResult = { success: true, message: 'Edited' };
      vi.mocked(mockFacade.editProfile!).mockResolvedValue(expectedResult);

      const command = new EditProfileCommand(mockFacade as HostSwitchFacade, 'local');
      const result = await command.execute();

      expect(result).toBe(expectedResult);
      expect(mockFacade.editProfile).toHaveBeenCalledWith('local');
    });
  });

  describe('ShowProfileCommand', () => {
    it('should execute showProfile on facade', async () => {
      const expectedResult: ICommandResult = { success: true, data: { content: '...' } };
      vi.mocked(mockFacade.showProfile!).mockResolvedValue(expectedResult);

      const command = new ShowProfileCommand(mockFacade as HostSwitchFacade, 'production');
      const result = await command.execute();

      expect(result).toBe(expectedResult);
      expect(mockFacade.showProfile).toHaveBeenCalledWith('production');
    });
  });

  describe('DeleteProfileCommand', () => {
    it('should execute deleteProfile on facade', async () => {
      const expectedResult: ICommandResult = { success: true, message: 'Deleted' };
      vi.mocked(mockFacade.deleteProfile!).mockResolvedValue(expectedResult);

      const command = new DeleteProfileCommand(mockFacade as HostSwitchFacade, 'old-profile');
      const result = await command.execute();

      expect(result).toBe(expectedResult);
      expect(mockFacade.deleteProfile).toHaveBeenCalledWith('old-profile', false);
    });
  });

  describe('ListBackupsCommand', () => {
    it('facade.listBackups を呼ぶ', async () => {
      const expected: ICommandResult = { success: true, data: { backups: [] } };
      vi.mocked(mockFacade.listBackups!).mockResolvedValue(expected);

      const command = new ListBackupsCommand(mockFacade as HostSwitchFacade);
      const result = await command.execute();

      expect(mockFacade.listBackups).toHaveBeenCalled();
      expect(result).toBe(expected);
    });
  });

  describe('RestoreBackupCommand', () => {
    it('id を facade.restoreBackup に渡す', async () => {
      const expected: ICommandResult = { success: true, message: 'Restored' };
      vi.mocked(mockFacade.restoreBackup!).mockResolvedValue(expected);

      const command = new RestoreBackupCommand(mockFacade as HostSwitchFacade, 'abc');
      const result = await command.execute();

      expect(mockFacade.restoreBackup).toHaveBeenCalledWith('abc');
      expect(result).toBe(expected);
    });

    it('id 省略時は undefined を渡す', async () => {
      vi.mocked(mockFacade.restoreBackup!).mockResolvedValue({ success: true });

      const command = new RestoreBackupCommand(mockFacade as HostSwitchFacade);
      await command.execute();

      expect(mockFacade.restoreBackup).toHaveBeenCalledWith(undefined);
    });
  });

  describe('StatusCommand', () => {
    it('facade.getStatus を呼ぶ', async () => {
      const expected: ICommandResult = { success: true, data: { status: {} } };
      vi.mocked(mockFacade.getStatus!).mockResolvedValue(expected);

      const command = new StatusCommand(mockFacade as HostSwitchFacade);
      const result = await command.execute();

      expect(mockFacade.getStatus).toHaveBeenCalled();
      expect(result).toBe(expected);
    });
  });

  describe('DeleteProfileCommand', () => {
    const makeUi = (canConfirm: boolean, confirmValue = true) =>
      ({
        canConfirmInteractively: vi.fn().mockReturnValue(canConfirm),
        promptConfirm: vi.fn().mockResolvedValue(confirmValue),
        showMessage: vi.fn(),
        promptSelect: vi.fn(),
        promptInput: vi.fn(),
        handleCommandResult: vi.fn(),
      }) as unknown as import('../../../interfaces').IUserInterface & {
        canConfirmInteractively: ReturnType<typeof vi.fn>;
        promptConfirm: ReturnType<typeof vi.fn>;
      };

    it('--force ならそのまま削除する', async () => {
      vi.mocked(mockFacade.deleteProfile!).mockResolvedValue({ success: true });

      const command = new DeleteProfileCommand(mockFacade as HostSwitchFacade, 'dev', true);
      await command.execute();

      expect(mockFacade.deleteProfile).toHaveBeenCalledWith('dev', true);
    });

    it('TTY があれば確認して Yes なら削除する', async () => {
      vi.mocked(mockFacade.deleteProfile!).mockResolvedValue({ success: true });
      const ui = makeUi(true, true);

      const command = new DeleteProfileCommand(mockFacade as HostSwitchFacade, 'dev', false, ui);
      await command.execute();

      expect(ui.promptConfirm).toHaveBeenCalled();
      expect(mockFacade.deleteProfile).toHaveBeenCalledWith('dev', true);
    });

    it('確認で No なら削除しない', async () => {
      const ui = makeUi(true, false);

      const command = new DeleteProfileCommand(mockFacade as HostSwitchFacade, 'dev', false, ui);
      const result = await command.execute();

      expect(mockFacade.deleteProfile).not.toHaveBeenCalled();
      expect(result.message).toContain('cancelled');
    });

    it('非TTYでは確認せず force=false で委譲する', async () => {
      vi.mocked(mockFacade.deleteProfile!).mockResolvedValue({
        success: false,
        requiresConfirmation: true,
      });
      const ui = makeUi(false);

      const command = new DeleteProfileCommand(mockFacade as HostSwitchFacade, 'dev', false, ui);
      await command.execute();

      expect(ui.promptConfirm).not.toHaveBeenCalled();
      expect(mockFacade.deleteProfile).toHaveBeenCalledWith('dev', false);
    });
  });
});
