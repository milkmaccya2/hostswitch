import type {
  Choice,
  Elevate,
  ICommandResult,
  ILogger,
  IUserInterface,
  MessageType,
  ProfileInfo,
} from '../../interfaces';

export class CliUserInterface implements IUserInterface {
  constructor(
    private logger: ILogger,
    /** sudo 再実行。渡されない場合は昇格せず、案内だけ出す */
    private elevate?: Elevate
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
    // 何を sudo で実行するかは呼び出し側が明示する。ここで現在の引数を流用すると
    // hosts の書き換えを伴わない操作までそのまま root で再実行されてしまう
    if (!result.sudoArgs) {
      this.showMessage('No sudo command provided', 'error');
      return;
    }

    if (!this.elevate) {
      // 昇格手段が渡されていない場合は、実行すべきコマンドを案内するに留める
      this.showMessage(
        `This operation requires sudo privileges. Run: ${result.sudoCommand ?? 'sudo hostswitch ' + result.sudoArgs.join(' ')}`,
        'warning'
      );
      return;
    }

    this.showMessage('This operation requires sudo privileges. Rerunning with sudo...', 'info');

    const sudoResult = await this.elevate(result.sudoArgs);
    if (!sudoResult.success) {
      this.showMessage(sudoResult.message || 'Failed to execute with sudo', 'error');
      process.exit(1);
    }

    if (sudoResult.message) {
      this.showMessage(sudoResult.message, 'success');
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
      // CLI モードは確認プロンプトを持たないため、適用は switch に委ねる
      if (result.requiresApply && result.profileName) {
        this.showMessage(
          `Run \`hostswitch switch ${result.profileName}\` to apply to /etc/hosts.`,
          'warning'
        );
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
