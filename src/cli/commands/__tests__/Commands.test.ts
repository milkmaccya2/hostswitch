import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ListProfilesCommand } from '../ListProfilesCommand';
import { CreateProfileCommand } from '../CreateProfileCommand';
import { SwitchProfileCommand } from '../SwitchProfileCommand';
import { EditProfileCommand } from '../EditProfileCommand';
import { ShowProfileCommand } from '../ShowProfileCommand';
import { DeleteProfileCommand } from '../DeleteProfileCommand';
import { HostSwitchFacade } from '../../HostSwitchFacade';
import { ICommandResult } from '../../../interfaces';

describe('Command Classes', () => {
  let mockFacade: HostSwitchFacade;

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
  });

  describe('ListProfilesCommand', () => {
    it('should execute listProfiles on facade', async () => {
      const expectedResult: ICommandResult = { success: true, data: { profiles: [] } };
      vi.mocked(mockFacade.listProfiles).mockResolvedValue(expectedResult);

      const command = new ListProfilesCommand(mockFacade);
      const result = await command.execute();

      expect(result).toBe(expectedResult);
      expect(mockFacade.listProfiles).toHaveBeenCalledOnce();
    });
  });

  describe('CreateProfileCommand', () => {
    it('should execute createProfile with default fromCurrent=false', async () => {
      const expectedResult: ICommandResult = { success: true, message: 'Created' };
      vi.mocked(mockFacade.createProfile).mockResolvedValue(expectedResult);

      const command = new CreateProfileCommand(mockFacade, 'test-profile');
      const result = await command.execute();

      expect(result).toBe(expectedResult);
      expect(mockFacade.createProfile).toHaveBeenCalledWith('test-profile', false);
    });

    it('should execute createProfile with fromCurrent=true', async () => {
      const expectedResult: ICommandResult = { success: true, message: 'Created' };
      vi.mocked(mockFacade.createProfile).mockResolvedValue(expectedResult);

      const command = new CreateProfileCommand(mockFacade, 'test-profile', true);
      const result = await command.execute();

      expect(result).toBe(expectedResult);
      expect(mockFacade.createProfile).toHaveBeenCalledWith('test-profile', true);
    });
  });

  describe('SwitchProfileCommand', () => {
    it('should execute switchProfile on facade', async () => {
      const expectedResult: ICommandResult = { success: true, message: 'Switched' };
      vi.mocked(mockFacade.switchProfile).mockResolvedValue(expectedResult);

      const command = new SwitchProfileCommand(mockFacade, 'staging');
      const result = await command.execute();

      expect(result).toBe(expectedResult);
      expect(mockFacade.switchProfile).toHaveBeenCalledWith('staging');
    });
  });

  describe('EditProfileCommand', () => {
    it('should execute editProfile on facade', async () => {
      const expectedResult: ICommandResult = { success: true, message: 'Edited' };
      vi.mocked(mockFacade.editProfile).mockResolvedValue(expectedResult);

      const command = new EditProfileCommand(mockFacade, 'local');
      const result = await command.execute();

      expect(result).toBe(expectedResult);
      expect(mockFacade.editProfile).toHaveBeenCalledWith('local');
    });
  });

  describe('ShowProfileCommand', () => {
    it('should execute showProfile on facade', async () => {
      const expectedResult: ICommandResult = { success: true, data: { content: '...' } };
      vi.mocked(mockFacade.showProfile).mockResolvedValue(expectedResult);

      const command = new ShowProfileCommand(mockFacade, 'production');
      const result = await command.execute();

      expect(result).toBe(expectedResult);
      expect(mockFacade.showProfile).toHaveBeenCalledWith('production');
    });
  });

  describe('DeleteProfileCommand', () => {
    it('should execute deleteProfile on facade', async () => {
      const expectedResult: ICommandResult = { success: true, message: 'Deleted' };
      vi.mocked(mockFacade.deleteProfile).mockResolvedValue(expectedResult);

      const command = new DeleteProfileCommand(mockFacade, 'old-profile');
      const result = await command.execute();

      expect(result).toBe(expectedResult);
      expect(mockFacade.deleteProfile).toHaveBeenCalledWith('old-profile');
    });
  });
});