import { ICommand, ICommandResult } from '../../interfaces';
import { HostSwitchFacade } from '../HostSwitchFacade';

export class ListProfilesCommand implements ICommand {
  constructor(private facade: HostSwitchFacade) {}

  async execute(): Promise<ICommandResult> {
    return this.facade.listProfiles();
  }
}