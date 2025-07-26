import type {
  Choice,
  ICommandResult,
  ILogger,
  IUserInterface,
  MessageType,
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
      this.showMessage('This operation requires sudo privileges. Rerunning with sudo...', 'info');

      // テスト環境では実際のsudo実行をスキップ
      if (
        process.env.NODE_ENV === 'test' ||
        process.env.VITEST === 'true' ||
        process.env.npm_lifecycle_event?.includes('test')
      ) {
        this.showMessage('(Skipped in test environment)', 'info');
        return;
      }

      // sudoCommandが存在しない場合はエラー
      if (!result.sudoCommand) {
        this.showMessage('No sudo command provided', 'error');
        return;
      }

      // 自動的にsudoで再実行
      try {
        const { execSync } = require('child_process');
        // 現在のプロセスの引数を使ってsudoで再実行
        const args = process.argv.slice(2).join(' ');
        execSync(`sudo ${process.argv[0]} ${process.argv[1]} ${args}`, { stdio: 'inherit' });
        process.exit(0);
      } catch (error) {
        this.showMessage('Failed to execute with sudo', 'error');
        process.exit(1);
      }
    }

    if (result.requiresConfirmation) {
      this.showMessage(
        'This operation requires confirmation. Add --force flag to proceed without confirmation.',
        'warning'
      );
      return;
    }

    if (result.success) {
      // Show data if present (for list and show commands)
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

  private displayData(data: any): void {
    if (data.profiles) {
      // List profiles command
      if (data.profiles.length === 0) {
        this.showMessage('No profiles found', 'info');
      } else {
        this.showMessage('Available profiles:', 'info');
        data.profiles.forEach((profile: any) => {
          const status = profile.isCurrent ? ' (current)' : '';
          this.logger.info(`  ${profile.name}${status}`);
        });
      }
    } else if (data.content !== undefined) {
      // Show profile command
      console.log(data.content);
    }
  }
}
