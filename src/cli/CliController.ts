import type { ICommand, IUserInterface } from '../interfaces';
import { CreateProfileCommand } from './commands/CreateProfileCommand';
import { DeleteProfileCommand } from './commands/DeleteProfileCommand';
import { EditProfileCommand } from './commands/EditProfileCommand';
import { ListProfilesCommand } from './commands/ListProfilesCommand';
import { ShowProfileCommand } from './commands/ShowProfileCommand';
import { SwitchProfileCommand } from './commands/SwitchProfileCommand';
import type { HostSwitchFacade } from './HostSwitchFacade';

export type CommandType = 'list' | 'create' | 'switch' | 'edit' | 'show' | 'delete';

export interface CommandParams {
  name?: string;
  fromCurrent?: boolean;
  force?: boolean;
}

export class CliController {
  constructor(
    private facade: HostSwitchFacade,
    private ui: IUserInterface
  ) {}

  async executeCommand(commandType: CommandType, params: CommandParams = {}): Promise<void> {
    try {
      const command = this.createCommand(commandType, params);
      const result = await command.execute();
      await this.ui.handleCommandResult(result);
    } catch (error) {
      this.ui.showMessage(
        `Error executing command: ${error instanceof Error ? error.message : String(error)}`,
        'error'
      );
    }
  }

  private createCommand(type: CommandType, params: CommandParams): ICommand {
    switch (type) {
      case 'list':
        return new ListProfilesCommand(this.facade);

      case 'create':
        if (!params.name) {
          throw new Error('Profile name is required for create command');
        }
        return new CreateProfileCommand(this.facade, params.name, params.fromCurrent || false);

      case 'switch':
        if (!params.name) {
          throw new Error('Profile name is required for switch command');
        }
        return new SwitchProfileCommand(this.facade, params.name);

      case 'edit':
        if (!params.name) {
          throw new Error('Profile name is required for edit command');
        }
        return new EditProfileCommand(this.facade, params.name);

      case 'show':
        if (!params.name) {
          throw new Error('Profile name is required for show command');
        }
        return new ShowProfileCommand(this.facade, params.name);

      case 'delete':
        if (!params.name) {
          throw new Error('Profile name is required for delete command');
        }
        return new DeleteProfileCommand(this.facade, params.name, params.force || false);

      default:
        throw new Error(`Unknown command type: ${type}`);
    }
  }
}
