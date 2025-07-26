import { ICommand, ICommandResult } from '../../interfaces';
import { HostSwitchFacade } from '../HostSwitchFacade';

export class ShowProfileCommand implements ICommand {
  constructor(
    private facade: HostSwitchFacade,
    private profileName: string
  ) {}

  async execute(): Promise<ICommandResult> {
    return this.facade.showProfile(this.profileName);
  }
}