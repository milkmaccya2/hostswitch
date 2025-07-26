import { ICommand, ICommandResult } from '../../interfaces';
import { HostSwitchFacade } from '../HostSwitchFacade';

export class SwitchProfileCommand implements ICommand {
  constructor(
    private facade: HostSwitchFacade,
    private profileName: string
  ) {}

  async execute(): Promise<ICommandResult> {
    return this.facade.switchProfile(this.profileName);
  }
}