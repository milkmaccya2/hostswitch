import type {
  Choice,
  ICommandResult,
  ILogger,
  IUserInterface,
  MessageType,
  ProfileInfo,
} from '../../interfaces';

export class CliUserInterface implements IUserInterface {
  constructor(private logger: ILogger) {}

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

  async promptConfirm(_message: string): Promise<boolean> {
    throw new Error(
      'Confirmation prompts are not supported in CLI mode. Use command line arguments instead.'
    );
  }

  async promptSelect<T>(_message: string, _choices: Choice<T>[]): Promise<T> {
    throw new Error(
      'Selection prompts are not supported in CLI mode. Use command line arguments instead.'
    );
  }

  async promptInput(
    _message: string,
    _validator?: (input: string) => boolean | string
  ): Promise<string> {
    throw new Error(
      'Input prompts are not supported in CLI mode. Use command line arguments instead.'
    );
  }

  async handleCommandResult(result: ICommandResult): Promise<void> {
    if (result.requiresSudo) {
      await this.handleSudoRequired(result);
      return;
    }

    if (result.requiresConfirmation) {
      this.handleConfirmationRequired();
      return;
    }

    this.handleResult(result);
  }

  private async handleSudoRequired(result: ICommandResult): Promise<void> {
    this.showMessage('This operation requires sudo privileges. Rerunning with sudo...', 'info');

    if (this.isTestEnvironment()) {
      this.showMessage('(Skipped in test environment)', 'info');
      return;
    }

    if (!result.sudoCommand) {
      this.showMessage('No sudo command provided', 'error');
      return;
    }

    await this.executeSudo();
  }

  private isTestEnvironment(): boolean {
    return (
      process.env.NODE_ENV === 'test' ||
      process.env.VITEST === 'true' ||
      Boolean(process.env.npm_lifecycle_event?.includes('test'))
    );
  }

  private async executeSudo(): Promise<void> {
    try {
      const { execSync } = require('node:child_process');
      const args = process.argv.slice(2).join(' ');
      execSync(`sudo ${process.argv[0]} ${process.argv[1]} ${args}`, { stdio: 'inherit' });
      process.exit(0);
    } catch (_error) {
      this.showMessage('Failed to execute with sudo', 'error');
      process.exit(1);
    }
  }

  private handleConfirmationRequired(): void {
    this.showMessage(
      'This operation requires confirmation. Add --force flag to proceed without confirmation.',
      'warning'
    );
  }

  private handleResult(result: ICommandResult): void {
    if (result.success) {
      if (result.data) {
        this.displayData(result.data);
      }
      if (result.message) {
        this.showMessage(result.message, 'success');
      }
    } else {
      this.showMessage(result.message || 'Operation failed', 'error');
      process.exit(1);
    }
  }

  private displayData(data: unknown): void {
    if (data && typeof data === 'object' && 'profiles' in data) {
      // List profiles command
      const profilesData = data as { profiles: ProfileInfo[] };
      if (profilesData.profiles.length === 0) {
        this.showMessage('No profiles found', 'info');
      } else {
        this.showMessage('Available profiles:', 'info');
        profilesData.profiles.forEach((profile) => {
          const status = profile.isCurrent ? ' (current)' : '';
          this.logger.info(`  ${profile.name}${status}`);
        });
      }
    } else if (data && typeof data === 'object' && 'content' in data) {
      // Show profile command
      const contentData = data as { content: string };
      console.log(contentData.content);
    }
  }
}
