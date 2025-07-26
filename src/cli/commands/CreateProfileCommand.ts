import { ICommand, ICommandResult } from '../../interfaces';
import { HostSwitchFacade } from '../HostSwitchFacade';

export class CreateProfileCommand implements ICommand {
  constructor(
    private facade: HostSwitchFacade,
    private profileName: string,
    private fromCurrent: boolean = false
  ) {}

  async execute(): Promise<ICommandResult> {
    return this.facade.createProfile(this.profileName, this.fromCurrent);
  }
}