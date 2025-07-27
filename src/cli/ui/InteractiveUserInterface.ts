import inquirer from 'inquirer';
import type {
  Choice,
  ICommandResult,
  ILogger,
  IUserInterface,
  MessageType,
  ProfileInfo,
} from '../../interfaces';
import type { HostSwitchFacade } from '../HostSwitchFacade';

export class InteractiveUserInterface implements IUserInterface {
  constructor(
    private facade: HostSwitchFacade,
    private logger: ILogger
  ) {}

  showMessage(message: string, type: MessageType = 'info'): void {
    switch (type) {
      case 'info':
        this.logger.info(message);
        break;
      case 'error':
        this.logger.error(message);
        break;
      case 'success':
        this.logger.success(message);
        break;
      case 'warning':
        this.logger.warning(message);
        break;
    }
  }

  async promptConfirm(message: string): Promise<boolean> {
    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message,
        default: false,
      },
    ]);
    return answer.confirmed;
  }

  async promptSelect<T>(message: string, choices: Choice<T>[]): Promise<T> {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message,
        choices,
      },
    ]);
    return answer.selected;
  }

  async promptInput(
    message: string,
    validator?: (input: string) => boolean | string
  ): Promise<string> {
    const answer = await inquirer.prompt([
      {
        type: 'input',
        name: 'input',
        message,
        validate: validator,
      },
    ]);
    return answer.input;
  }

  async handleCommandResult(result: ICommandResult): Promise<void> {
    if (result.requiresSudo) {
      await this.handleSudoRequired(result);
      return;
    }

    if (result.requiresConfirmation) {
      const confirmed = await this.promptConfirm(`Are you sure? ${result.message || ''}`);
      if (!confirmed) {
        this.showMessage('Operation cancelled', 'info');
        return;
      }
    }

    if (result.success) {
      if (result.message) {
        this.showMessage(result.message, 'success');
      }
    } else {
      this.showMessage(result.message || 'Operation failed', 'error');
    }
  }

  async run(): Promise<void> {
    while (true) {
      try {
        const action = await this.showMainMenu();

        if (action === 'exit') {
          this.showMessage('Goodbye!', 'info');
          break;
        }

        const shouldExit = await this.executeAction(action);
        if (shouldExit) {
          break;
        }
      } catch (error) {
        this.showMessage(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
          'error'
        );
      }
    }
  }

  private async showMainMenu(): Promise<string> {
    const currentProfile = this.facade.getCurrentProfile();
    const statusText = currentProfile ? `current: ${currentProfile}` : 'no profile active';

    const choices: Choice<string>[] = [
      { name: `Switch profile (${statusText})`, value: 'switch' },
      { name: 'List all profiles', value: 'list' },
      { name: 'Create new profile', value: 'create' },
      { name: 'Edit profile', value: 'edit' },
      { name: 'Show profile content', value: 'show' },
      { name: 'Delete profile', value: 'delete' },
      { name: 'Exit', value: 'exit' },
    ];

    return this.promptSelect('What would you like to do?', choices);
  }

  private async executeAction(action: string): Promise<boolean> {
    switch (action) {
      case 'list':
        await this.handleListProfiles();
        return false; // Continue interactive mode
      case 'switch':
        await this.handleSwitchProfile();
        return true; // Exit after action
      case 'create':
        await this.handleCreateProfile();
        return true; // Exit after action
      case 'edit':
        await this.handleEditProfile();
        return true; // Exit after action
      case 'show':
        await this.handleShowProfile();
        return true; // Exit after action
      case 'delete':
        await this.handleDeleteProfile();
        return true; // Exit after action
      default:
        return false;
    }
  }

  private async handleListProfiles(): Promise<void> {
    const result = await this.facade.listProfiles();

    if (result.success && result.data) {
      const data = result.data as { profiles: ProfileInfo[] };
      const profiles = data.profiles;
      if (profiles.length === 0) {
        this.showMessage('No profiles found. Create one first!', 'info');
      } else {
        this.showMessage('Available profiles:', 'info');
        for (const profile of profiles) {
          const status = profile.isActive ? ' (current)' : '';
          this.showMessage(`  ${profile.name}${status}`, 'info');
        }
      }
    } else {
      await this.handleCommandResult(result);
    }
  }

  private async handleSwitchProfile(): Promise<void> {
    const listResult = await this.facade.listProfiles();
    if (!listResult.success || !listResult.data) {
      this.showMessage('No profiles available to switch to', 'warning');
      return;
    }
    const listData = listResult.data as { profiles: ProfileInfo[] };
    if (listData.profiles.length === 0) {
      this.showMessage('No profiles available to switch to', 'warning');
      return;
    }

    const switchableProfiles = listData.profiles.filter((p) => !p.isActive);
    if (switchableProfiles.length === 0) {
      this.showMessage('No other profiles available to switch to', 'info');
      return;
    }

    const choices: Choice<string>[] = switchableProfiles.map((p) => ({
      name: p.name,
      value: p.name,
    }));

    const profileName = await this.promptSelect('Select profile to switch to:', choices);
    const result = await this.facade.switchProfile(profileName);
    await this.handleCommandResult(result);
  }

  private async handleCreateProfile(): Promise<void> {
    const profileName = await this.promptInput('Enter profile name:', (input: string) => {
      if (!input.trim()) return 'Profile name cannot be empty';
      if (!/^[a-zA-Z0-9_-]+$/.test(input)) {
        return 'Use only letters, numbers, hyphens, and underscores';
      }
      return true;
    });

    const fromCurrent = await this.promptConfirm('Copy current hosts file content?');
    const result = await this.facade.createProfile(profileName, fromCurrent);
    await this.handleCommandResult(result);
  }

  private async handleEditProfile(): Promise<void> {
    const listResult = await this.facade.listProfiles();
    if (!listResult.success || !listResult.data) {
      this.showMessage('No profiles available to edit', 'warning');
      return;
    }
    const listData = listResult.data as { profiles: ProfileInfo[] };
    if (listData.profiles.length === 0) {
      this.showMessage('No profiles available to edit', 'warning');
      return;
    }

    const choices: Choice<string>[] = listData.profiles.map((p) => ({
      name: p.name,
      value: p.name,
    }));

    const profileName = await this.promptSelect('Select profile to edit:', choices);
    const result = await this.facade.editProfile(profileName);
    await this.handleCommandResult(result);
  }

  private async handleShowProfile(): Promise<void> {
    const listResult = await this.facade.listProfiles();
    if (!listResult.success || !listResult.data) {
      this.showMessage('No profiles available to show', 'warning');
      return;
    }
    const listData = listResult.data as { profiles: ProfileInfo[] };
    if (listData.profiles.length === 0) {
      this.showMessage('No profiles available to show', 'warning');
      return;
    }

    const choices: Choice<string>[] = listData.profiles.map((p) => ({
      name: p.name,
      value: p.name,
    }));

    const profileName = await this.promptSelect('Select profile to show:', choices);
    const result = await this.facade.showProfile(profileName);

    if (result.success && result.data) {
      const data = result.data as { content: string };
      this.showMessage(`\nContent of profile "${profileName}":`, 'info');
      this.showMessage(data.content, 'info');
    } else {
      await this.handleCommandResult(result);
    }
  }

  private async handleDeleteProfile(): Promise<void> {
    const deletableProfiles = this.facade.getDeletableProfiles();
    if (deletableProfiles.length === 0) {
      this.showMessage('No profiles available for deletion', 'warning');
      return;
    }

    const choices: Choice<string>[] = deletableProfiles.map((p) => ({
      name: p.name,
      value: p.name,
    }));

    const profileName = await this.promptSelect('Select profile to delete:', choices);
    const confirmed = await this.promptConfirm(`Are you sure you want to delete "${profileName}"?`);

    if (confirmed) {
      const result = await this.facade.deleteProfile(profileName);
      if (result.success) {
        this.showMessage(result.message || 'Profile deleted successfully', 'success');
      } else {
        await this.handleCommandResult(result);
      }
    } else {
      this.showMessage('Deletion cancelled', 'info');
    }
  }

  private async handleSudoRequired(result: ICommandResult): Promise<void> {
    this.showMessage('This operation requires sudo privileges.', 'warning');

    if (result.sudoCommand?.includes('switch')) {
      // sudo hostswitch switch profile-name の形式から profile-name を抽出
      const parts = result.sudoCommand.split(' ');
      const switchIndex = parts.indexOf('switch');
      if (switchIndex >= 0 && switchIndex + 1 < parts.length) {
        const profileName = parts[switchIndex + 1];
        this.showMessage(`Switching to profile "${profileName}" with sudo...`, 'info');
        try {
          const sudoResult = await this.facade.switchProfileWithSudo(profileName);
          await this.handleCommandResult(sudoResult);
        } catch (error) {
          this.showMessage(
            `Failed to execute sudo command: ${error instanceof Error ? error.message : String(error)}`,
            'error'
          );
        }
      }
    }
  }
}
