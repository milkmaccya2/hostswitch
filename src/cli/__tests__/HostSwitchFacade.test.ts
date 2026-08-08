import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HostSwitchService } from '../../core/HostSwitchService';
import type {
  CreateProfileResult,
  DeleteResult,
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
  let mockService: Partial<HostSwitchService> & {
    getProfiles: ReturnType<typeof vi.fn>;
    createProfile: ReturnType<typeof vi.fn>;
    switchProfile: ReturnType<typeof vi.fn>;
    deleteProfile: ReturnType<typeof vi.fn>;
    getProfileContent: ReturnType<typeof vi.fn>;
    profileExists: ReturnType<typeof vi.fn>;
    getProfilePath: ReturnType<typeof vi.fn>;
    getCurrentProfile: ReturnType<typeof vi.fn>;
    getConfig: ReturnType<typeof vi.fn>;
    getHostsPath: ReturnType<typeof vi.fn>;
    isProfileApplied: ReturnType<typeof vi.fn>;
    isValidProfileName: ReturnType<typeof vi.fn>;
    getBackups: ReturnType<typeof vi.fn>;
    restoreBackup: ReturnType<typeof vi.fn>;
    getStatus: ReturnType<typeof vi.fn>;
  };
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
      getHostsPath: vi.fn().mockReturnValue('/etc/hosts'),
      isProfileApplied: vi.fn().mockReturnValue(true),
      isValidProfileName: vi.fn((name: string) => /^[a-zA-Z0-9_-]+$/.test(name)),
      getBackups: vi.fn().mockReturnValue([]),
      restoreBackup: vi.fn(),
      getStatus: vi.fn(),
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

    facade = new HostSwitchFacade(
      mockService as unknown as HostSwitchService,
      mockProcessManager,
      mockPermissionChecker
    );
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
      expect(result.sudoArgs).toEqual(['switch', 'staging']);
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

  describe('elevate', () => {
    it('should execute with sudo successfully', async () => {
      const sudoResult: SudoResult = {
        success: true,
        message: 'Switched successfully',
      };
      vi.mocked(mockPermissionChecker.rerunWithSudo).mockResolvedValue(sudoResult);

      const result = await facade.elevate(['switch', 'staging']);

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

      const result = await facade.elevate(['switch', 'staging']);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to run with sudo: Permission denied');
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
    const originalEditor = process.env.EDITOR;

    beforeEach(() => {
      delete process.env.EDITOR;
    });

    afterEach(() => {
      if (originalEditor === undefined) {
        delete process.env.EDITOR;
      } else {
        process.env.EDITOR = originalEditor;
      }
    });

    it('should fall back to vi when $EDITOR is not set', async () => {
      vi.mocked(mockService.profileExists).mockReturnValue(true);
      vi.mocked(mockService.getProfilePath).mockReturnValue('/path/to/profile');
      vi.mocked(mockProcessManager.openEditor).mockResolvedValue();

      const result = await facade.editProfile('local');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Profile "local" edited successfully');
      expect(mockProcessManager.openEditor).toHaveBeenCalledWith('vi', '/path/to/profile');
    });

    it('should use $EDITOR when set', async () => {
      process.env.EDITOR = 'code --wait';
      vi.mocked(mockService.profileExists).mockReturnValue(true);
      vi.mocked(mockService.getProfilePath).mockReturnValue('/path/to/profile');
      vi.mocked(mockProcessManager.openEditor).mockResolvedValue();

      await facade.editProfile('local');

      expect(mockProcessManager.openEditor).toHaveBeenCalledWith('code --wait', '/path/to/profile');
    });

    it('should fall back to vi when $EDITOR is empty', async () => {
      process.env.EDITOR = '';
      vi.mocked(mockService.profileExists).mockReturnValue(true);
      vi.mocked(mockService.getProfilePath).mockReturnValue('/path/to/profile');
      vi.mocked(mockProcessManager.openEditor).mockResolvedValue();

      await facade.editProfile('local');

      expect(mockProcessManager.openEditor).toHaveBeenCalledWith('vi', '/path/to/profile');
    });

    it('should flag apply when editing the current profile leaves hosts stale', async () => {
      vi.mocked(mockService.profileExists).mockReturnValue(true);
      vi.mocked(mockService.getProfilePath).mockReturnValue('/path/to/profile');
      vi.mocked(mockProcessManager.openEditor).mockResolvedValue();
      mockService.getCurrentProfile.mockReturnValue('local');
      mockService.isProfileApplied.mockReturnValue(false);

      const result = await facade.editProfile('local');

      expect(result.success).toBe(true);
      expect(result.requiresApply).toBe(true);
      expect(result.profileName).toBe('local');
    });

    it('should not flag apply when the current profile is already applied', async () => {
      vi.mocked(mockService.profileExists).mockReturnValue(true);
      vi.mocked(mockService.getProfilePath).mockReturnValue('/path/to/profile');
      vi.mocked(mockProcessManager.openEditor).mockResolvedValue();
      mockService.getCurrentProfile.mockReturnValue('local');
      mockService.isProfileApplied.mockReturnValue(true);

      const result = await facade.editProfile('local');

      expect(result.requiresApply).toBe(false);
    });

    it('should not read hosts when editing a profile that is not current', async () => {
      vi.mocked(mockService.profileExists).mockReturnValue(true);
      vi.mocked(mockService.getProfilePath).mockReturnValue('/path/to/profile');
      vi.mocked(mockProcessManager.openEditor).mockResolvedValue();
      mockService.getCurrentProfile.mockReturnValue('staging');

      const result = await facade.editProfile('local');

      expect(result.requiresApply).toBe(false);
      expect(mockService.isProfileApplied).not.toHaveBeenCalled();
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

  describe('listBackups', () => {
    it('サービスの一覧を data に載せて返す', async () => {
      const backups = [{ id: 'a', path: '/b/a', createdAt: null }];
      mockService.getBackups.mockReturnValue(backups);

      const result = await facade.listBackups();

      expect(result.success).toBe(true);
      expect((result.data as { backups: unknown }).backups).toEqual(backups);
    });
  });

  describe('restoreBackup', () => {
    it('バックアップが無ければ失敗を返す', async () => {
      mockService.getBackups.mockReturnValue([]);

      const result = await facade.restoreBackup();

      expect(result.success).toBe(false);
      expect(result.message).toContain('No backups');
    });

    it('存在しない id を弾く', async () => {
      mockService.getBackups.mockReturnValue([{ id: 'a', path: '/b/a', createdAt: null }]);

      const result = await facade.restoreBackup('zzz');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('sudo が必要なら sudoArgs を返す（id あり）', async () => {
      mockService.getBackups.mockReturnValue([{ id: 'a', path: '/b/a', createdAt: null }]);
      vi.mocked(mockPermissionChecker.requiresSudo).mockReturnValue(true);

      const result = await facade.restoreBackup('a');

      expect(result.requiresSudo).toBe(true);
      expect(result.sudoArgs).toEqual(['restore', 'a']);
    });

    it('sudo が必要なら sudoArgs を返す（id 省略）', async () => {
      mockService.getBackups.mockReturnValue([{ id: 'a', path: '/b/a', createdAt: null }]);
      vi.mocked(mockPermissionChecker.requiresSudo).mockReturnValue(true);

      const result = await facade.restoreBackup();

      expect(result.sudoArgs).toEqual(['restore']);
    });

    it('sudo 不要ならサービスに委譲する', async () => {
      mockService.getBackups.mockReturnValue([{ id: 'a', path: '/b/a', createdAt: null }]);
      vi.mocked(mockPermissionChecker.requiresSudo).mockReturnValue(false);
      mockService.restoreBackup.mockReturnValue({
        success: true,
        message: "Restored hosts from backup 'a'.",
        backupPath: '/b/prev',
      });

      const result = await facade.restoreBackup('a');

      expect(mockService.restoreBackup).toHaveBeenCalledWith('a');
      expect(result.success).toBe(true);
      expect(result.message).toContain('previous hosts backed up');
    });

    it('事前チェックを通ってもサービスが requiresSudo を返したら sudoArgs を付ける', async () => {
      // accessSync が書けると誤判定し、実際の rename が EACCES になるケース
      mockService.getBackups.mockReturnValue([{ id: 'a', path: '/b/a', createdAt: null }]);
      vi.mocked(mockPermissionChecker.requiresSudo).mockReturnValue(false);
      mockService.restoreBackup.mockReturnValue({ success: false, requiresSudo: true });

      const result = await facade.restoreBackup('a');

      expect(result.requiresSudo).toBe(true);
      expect(result.sudoArgs).toEqual(['restore', 'a']);
    });
  });

  describe('getStatus', () => {
    it('サービスの status を data に載せる', async () => {
      const status = {
        currentProfile: 'dev',
        hostsPath: '/etc/hosts',
        modified: false,
        updatedAt: null,
        latestBackup: null,
      };
      mockService.getStatus.mockReturnValue(status);

      const result = await facade.getStatus();

      expect(result.success).toBe(true);
      expect((result.data as { status: unknown }).status).toEqual(status);
    });
  });
});
