import { IUserInterface, MessageType, Choice, ICommandResult, ILogger } from '../../interfaces';

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
    throw new Error('Confirmation prompts are not supported in CLI mode. Use command line arguments instead.');
  }

  async promptSelect<T>(_message: string, _choices: Choice<T>[]): Promise<T> {
    throw new Error('Selection prompts are not supported in CLI mode. Use command line arguments instead.');
  }

  async promptInput(_message: string, _validator?: (input: string) => boolean | string): Promise<string> {
    throw new Error('Input prompts are not supported in CLI mode. Use command line arguments instead.');
  }

  async handleCommandResult(result: ICommandResult): Promise<void> {
    if (result.requiresSudo) {
      this.showMessage('This operation requires sudo privileges.', 'warning');
      if (result.sudoCommand) {
        this.showMessage(`Please run: ${result.sudoCommand}`, 'info');
      }
      return;
    }

    if (result.requiresConfirmation) {
      this.showMessage('This operation requires confirmation. Add --force flag to proceed without confirmation.', 'warning');
      return;
    }

    if (result.success) {
      if (result.message) {
        this.showMessage(result.message, 'success');
      }
    } else {
      this.showMessage(result.message || 'Operation failed', 'error');
      process.exit(1);
    }
  }
}