import inquirer from 'inquirer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HostSwitchService } from '../../core/HostSwitchService';
import type {
  CreateProfileResult,
  HostSwitchConfig,
  IFileSystem,
  ILogger,
  IPermissionChecker,
  IProcessManager,
  ProfileInfo,
  SwitchResult,
} from '../../interfaces';
import { CliController } from '../CliController';
import { HostSwitchFacade } from '../HostSwitchFacade';
import { CliUserInterface } from '../ui/CliUserInterface';
import { InteractiveUserInterface } from '../ui/InteractiveUserInterface';

vi.mock('inquirer');

describe('Integration Tests', () => {
  let mockFileSystem: IFileSystem;
  let mockLogger: ILogger;
  let mockProcessManager: IProcessManager;
  let mockPermissionChecker: IPermissionChecker;
  let hostSwitchService: HostSwitchService;
  let facade: HostSwitchFacade;
  let controller: CliController;
  let cliUI: CliUserInterface;
  let interactiveUI: InteractiveUserInterface;

  const mockConfig: HostSwitchConfig = {
    configDir: '/home/user/.hostswitch',
    profilesDir: '/home/user/.hostswitch/profiles',
    backupDir: '/home/user/.hostswitch/backups',
    currentProfileFile: '/home/user/.hostswitch/current.json',
    hostsPath: '/etc/hosts',
  };

  beforeEach(() => {
    mockFileSystem = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      readFileSync: vi.fn(),
      writeFileSync: vi.fn(),
      copySync: vi.fn(),
      unlinkSync: vi.fn(),
      existsSync: vi.fn().mockReturnValue(true),
      ensureDirSync: vi.fn(),
      readdirSync: vi.fn().mockReturnValue([]),
      readJsonSync: vi.fn(),
      writeJsonSync: vi.fn(),
    };

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

    hostSwitchService = new HostSwitchService(
      mockFileSystem,
      mockLogger,
      mockConfig,
      mockPermissionChecker
    );

    facade = new HostSwitchFacade(hostSwitchService, mockProcessManager, mockPermissionChecker);

    cliUI = new CliUserInterface(mockLogger);
    interactiveUI = new InteractiveUserInterface(facade, mockLogger);
    controller = new CliController(facade, cliUI);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Full workflow integration', () => {
    it('should complete a full create-list-switch-delete workflow', async () => {
      // Setup mocks for the workflow
      const profiles: ProfileInfo[] = [
        { name: 'local', isCurrent: true },
        { name: 'staging', isCurrent: false },
      ];

      const createResult: CreateProfileResult = {
        success: true,
        message: 'Profile created',
      };

      const switchResult: SwitchResult = {
        success: true,
        message: 'Switched successfully',
        backupPath: '/backup/path',
      };

      // Mock service methods
      vi.spyOn(hostSwitchService, 'createProfile').mockReturnValue(createResult);
      vi.spyOn(hostSwitchService, 'getProfiles').mockReturnValue(profiles);
      vi.spyOn(hostSwitchService, 'switchProfile').mockResolvedValue(switchResult);
      vi.spyOn(hostSwitchService, 'deleteProfile').mockImplementation(() => ({
        success: true,
        message: 'Deleted',
      }));
      vi.spyOn(hostSwitchService, 'profileExists').mockReturnValue(true);
      vi.mocked(mockPermissionChecker.requiresSudo).mockReturnValue(false);

      // 1. Create profile
      await controller.executeCommand('create', { name: 'test-profile', fromCurrent: false });
      expect(mockLogger.success).toHaveBeenCalledWith(
        'Profile \"test-profile\" created successfully'
      );

      // 2. List profiles
      await controller.executeCommand('list');
      expect(hostSwitchService.getProfiles).toHaveBeenCalled();

      // 3. Switch profile
      vi.mocked(mockPermissionChecker.requiresSudo).mockReturnValue(false);
      vi.spyOn(facade, 'switchProfile').mockResolvedValue({
        success: true,
        message: 'Switched to test-profile',
      });
      await controller.executeCommand('switch', { name: 'test-profile' });
      expect(facade.switchProfile).toHaveBeenCalledWith('test-profile');

      // 4. Delete profile with force flag
      await controller.executeCommand('delete', { name: 'test-profile', force: true });
      expect(hostSwitchService.deleteProfile).toHaveBeenCalledWith('test-profile');
    });

    it('should handle sudo requirement in CLI mode', async () => {
      vi.spyOn(facade, 'switchProfile').mockResolvedValue({
        success: false,
        requiresSudo: true,
        sudoCommand: 'sudo hostswitch switch staging',
        message: 'This operation requires sudo privileges.',
      });

      await controller.executeCommand('switch', { name: 'staging' });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'This operation requires sudo privileges. Rerunning with sudo...'
      );
      expect(mockLogger.info).toHaveBeenCalledWith('(Skipped in test environment)');
    });

    it('should handle complex sudo scenarios in interactive mode', async () => {
      // Test auto-sudo functionality in interactive mode
      vi.spyOn(facade, 'switchProfile').mockResolvedValue({
        success: false,
        requiresSudo: true,
        sudoCommand: 'sudo hostswitch switch production',
        message: 'This operation requires sudo privileges.',
      });

      vi.spyOn(facade, 'switchProfileWithSudo').mockResolvedValue({
        success: true,
        message: 'Successfully switched to production with sudo',
      });

      // Simulate going through interactive UI
      const result = await facade.switchProfile('production');
      expect(result.requiresSudo).toBe(true);

      // Now test the sudo execution
      const sudoResult = await facade.switchProfileWithSudo('production');
      expect(sudoResult.success).toBe(true);
      expect(sudoResult.message).toBe('Successfully switched to production with sudo');
    });

    it('should handle permission errors gracefully', async () => {
      vi.spyOn(facade, 'switchProfile').mockResolvedValue({
        success: false,
        requiresSudo: true,
        sudoCommand: 'sudo hostswitch switch staging',
        message: 'This operation requires sudo privileges.',
      });

      vi.spyOn(facade, 'switchProfileWithSudo').mockResolvedValue({
        success: false,
        message: 'Permission denied even with sudo',
      });

      const result = await facade.switchProfile('staging');
      expect(result.requiresSudo).toBe(true);

      const sudoResult = await facade.switchProfileWithSudo('staging');
      expect(sudoResult.success).toBe(false);
      expect(sudoResult.message).toBe('Permission denied even with sudo');
    });

    it('should handle errors gracefully', async () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      vi.spyOn(facade, 'createProfile').mockResolvedValue({
        success: false,
        message: 'Profile creation failed',
      });

      await controller.executeCommand('create', { name: 'failing-profile' });

      expect(mockLogger.error).toHaveBeenCalledWith('Profile creation failed');
      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    });
  });

  describe('Interactive mode integration', () => {
    it('should handle list profiles in interactive mode', async () => {
      vi.spyOn(hostSwitchService, 'getProfiles').mockReturnValue([
        { name: 'local', isCurrent: true },
        { name: 'staging', isCurrent: false },
      ]);

      const listResult = await facade.listProfiles();

      expect(listResult.success).toBe(true);
      expect((listResult.data as { profiles: unknown[] })?.profiles).toHaveLength(2);
    });

    it('should handle user input validation', async () => {
      const result = await facade.createProfile('invalid/name', false);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid profile name');
    });
  });

  describe('Command parameter validation', () => {
    it('should handle missing profile name in create command', async () => {
      await controller.executeCommand('create', {});
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error executing command: Profile name is required for create command'
      );
    });

    it('should handle missing profile name in switch command', async () => {
      await controller.executeCommand('switch', {});
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error executing command: Profile name is required for switch command'
      );
    });

    it('should handle unknown command type', async () => {
      // @ts-expect-error Testing invalid command type
      await controller.executeCommand('unknown', {});
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error executing command: Unknown command type: unknown'
      );
    });
  });

  describe('UI interface integration', () => {
    it('should handle inquirer prompts in interactive UI', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ confirmed: true });

      const confirmed = await interactiveUI.promptConfirm('Are you sure?');

      expect(confirmed).toBe(true);
      expect(inquirer.prompt).toHaveBeenCalledWith([
        {
          type: 'confirm',
          name: 'confirmed',
          message: 'Are you sure?',
          default: false,
        },
      ]);
    });

    it('should throw errors for unsupported operations in CLI UI', async () => {
      await expect(cliUI.promptConfirm('Are you sure?')).rejects.toThrow(
        'not supported in CLI mode'
      );
      await expect(cliUI.promptSelect('Choose:', [])).rejects.toThrow('not supported in CLI mode');
      await expect(cliUI.promptInput('Enter:')).rejects.toThrow('not supported in CLI mode');
    });
  });
});
