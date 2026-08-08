import type { ICommand, ICommandResult } from '../../interfaces';
import type { HostSwitchFacade } from '../HostSwitchFacade';

export class ListBackupsCommand implements ICommand {
  constructor(private facade: HostSwitchFacade) {}

  async execute(): Promise<ICommandResult> {
    return this.facade.listBackups();
  }
}
