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
});
