import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HostSwitchService } from '../../core/HostSwitchService';
import type {
  CreateProfileResult,
  DeleteResult,
  ILogger,
  IPermissionChecker,
  IProcessManager,
  ProfileContentResult,
  ProfileInfo,
  SudoResult,
  SwitchResult,
} from '../../interfaces';
import { HostSwitchFacade } from '../HostSwitchFacade';

describe('HostSwitchFacade', () => {
  let facade: HostSwitchFacade;
  let mockService: HostSwitchService;
  let _mockLogger: ILogger;
  let mockProcessManager: IProcessManager;
  let mockPermissionChecker: IPermissionChecker;

  beforeEach(() => {
    mockService = {
      getProfiles: vi.fn(),
      createProfile: vi.fn(),
      switchProfile: vi.fn(),
      deleteProfile: vi.fn(),
      getProfileContent: vi.fn(),
      profileExists: vi.fn(),
      getProfilePath: vi.fn(),
      getCurrentProfile: vi.fn(),
      getConfig: vi.fn().mockReturnValue({ hostsPath: '/etc/hosts' }),
    } as any;

    _mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      dim: vi.fn(),
      bold: vi.fn(),
    };

    mockProcessManager = {
      executeEditor: vi.fn(),
      openEditor: vi.fn(),
    };

    mockPermissionChecker = {
      canWriteToFile: vi.fn(),
      requiresSudo: vi.fn(),
      checkPermissions: vi.fn(),
      isRunningAsSudo: vi.fn(),
      rerunWithSudo: vi.fn(),
    };

    facade = new HostSwitchFacade(mockService, mockProcessManager, mockPermissionChecker);
  });

  describe('listProfiles', () => {
    it('should return success with profile list', async () => {
      const profiles: ProfileInfo[] = [
        { name: 'local', isCurrent: true },
        { name: 'staging', isCurrent: false },
      ];
      vi.mocked(mockService.getProfiles).mockReturnValue(profiles);

      const result = await facade.listProfiles();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ profiles });
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(mockService.getProfiles).mockImplementation(() => {
        throw new Error('Failed to read profiles');
      });

      const result = await facade.listProfiles();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to list profiles: Failed to read profiles');
    });
  });

  describe('createProfile', () => {
    it('should create profile successfully', async () => {
      const createResult: CreateProfileResult = {
        success: true,
        message: 'Profile created successfully',
      };
      vi.mocked(mockService.createProfile).mockReturnValue(createResult);

      const result = await facade.createProfile('test-profile', false);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Profile "test-profile" created successfully');
      expect(mockService.createProfile).toHaveBeenCalledWith('test-profile', false);
    });

    it('should validate profile name', async () => {
      const result = await facade.createProfile('invalid/name', false);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid profile name');
      expect(mockService.createProfile).not.toHaveBeenCalled();
    });

    it('should handle creation failure', async () => {
      const createResult: CreateProfileResult = {
        success: false,
        message: 'Profile already exists',
      };
      vi.mocked(mockService.createProfile).mockReturnValue(createResult);

      const result = await facade.createProfile('existing', false);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Profile already exists');
    });
  });

  describe('switchProfile', () => {
    it('should detect sudo requirement', async () => {
      vi.mocked(mockService.profileExists).mockReturnValue(true);
      vi.mocked(mockPermissionChecker.requiresSudo).mockReturnValue(true);

      const result = await facade.switchProfile('staging');

      expect(result.success).toBe(false);
      expect(result.requiresSudo).toBe(true);
      expect(result.sudoCommand).toBe('sudo hostswitch switch staging');
      expect(mockService.switchProfile).not.toHaveBeenCalled();
    });

    it('should switch profile when sudo not required', async () => {
      vi.mocked(mockService.profileExists).mockReturnValue(true);
      vi.mocked(mockPermissionChecker.requiresSudo).mockReturnValue(false);
      const switchResult: SwitchResult = {
        success: true,
        message: 'Switched successfully',
        backupPath: '/path/to/backup',
      };
      vi.mocked(mockService.switchProfile).mockResolvedValue(switchResult);

      const result = await facade.switchProfile('staging');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Switched to profile "staging"');
      expect(result.data).toEqual({ switchResult });
    });

    it('should handle non-existent profile', async () => {
      vi.mocked(mockService.profileExists).mockReturnValue(false);

      const result = await facade.switchProfile('nonexistent');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Profile "nonexistent" does not exist');
    });
  });

  describe('switchProfileWithSudo', () => {
    it('should execute with sudo successfully', async () => {
      const sudoResult: SudoResult = {
        success: true,
        message: 'Switched successfully',
      };
      vi.mocked(mockPermissionChecker.rerunWithSudo).mockResolvedValue(sudoResult);

      const result = await facade.switchProfileWithSudo('staging');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Switched successfully');
      expect(mockPermissionChecker.rerunWithSudo).toHaveBeenCalledWith(['switch', 'staging']);
    });

    it('should handle sudo failure', async () => {
      const sudoResult: SudoResult = {
        success: false,
        message: 'Permission denied',
      };
      vi.mocked(mockPermissionChecker.rerunWithSudo).mockResolvedValue(sudoResult);

      const result = await facade.switchProfileWithSudo('staging');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to switch profile: Permission denied');
    });
  });

  describe('deleteProfile', () => {
    it('should delete profile successfully', async () => {
      const deleteResult: DeleteResult = {
        success: true,
        message: 'Profile deleted successfully',
      };
      vi.mocked(mockService.deleteProfile).mockReturnValue(deleteResult);

      const result = await facade.deleteProfile('old-profile', true);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Profile "old-profile" deleted successfully');
    });

    it('should require confirmation for deletion', async () => {
      const deleteResult: DeleteResult = {
        success: true,
        message: 'Profile deleted successfully',
      };
      vi.mocked(mockService.deleteProfile).mockReturnValue(deleteResult);

      const result = await facade.deleteProfile('important');

      expect(result.requiresConfirmation).toBe(true);
    });
  });

  describe('showProfile', () => {
    it('should show profile content', async () => {
      const contentResult: ProfileContentResult = {
        success: true,
        content: '127.0.0.1 localhost',
      };
      vi.mocked(mockService.getProfileContent).mockReturnValue(contentResult);

      const result = await facade.showProfile('local');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ content: '127.0.0.1 localhost' });
    });
  });

  describe('editProfile', () => {
    it('should open editor for profile', async () => {
      vi.mocked(mockService.profileExists).mockReturnValue(true);
      vi.mocked(mockService.getProfilePath).mockReturnValue('/path/to/profile');
      vi.mocked(mockProcessManager.openEditor).mockResolvedValue();

      const result = await facade.editProfile('local');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Profile "local" edited successfully');
      expect(mockProcessManager.openEditor).toHaveBeenCalledWith('vi', '/path/to/profile');
    });

    it('should handle editor errors', async () => {
      vi.mocked(mockService.profileExists).mockReturnValue(true);
      vi.mocked(mockService.getProfilePath).mockReturnValue('/path/to/profile');
      vi.mocked(mockProcessManager.openEditor).mockRejectedValue(new Error('Editor failed'));

      const result = await facade.editProfile('local');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to edit profile: Editor failed');
    });
  });

  describe('getCurrentProfile', () => {
    it('should return current profile name', () => {
      vi.mocked(mockService.getCurrentProfile).mockReturnValue('local');

      const result = facade.getCurrentProfile();

      expect(result).toBe('local');
    });
  });

  describe('getDeletableProfiles', () => {
    it('should return only deletable profiles', () => {
      const profiles: ProfileInfo[] = [
        { name: 'local', isCurrent: true },
        { name: 'staging', isCurrent: false },
        { name: 'production', isCurrent: false },
      ];
      vi.mocked(mockService.getProfiles).mockReturnValue(profiles);

      const result = facade.getDeletableProfiles();

      expect(result).toHaveLength(2);
      expect(result.map((p) => p.name)).toEqual(['staging', 'production']);
    });
  });
});
