import type { ICommand, ICommandResult } from '../../interfaces';
import type { HostSwitchFacade } from '../HostSwitchFacade';

export class EditProfileCommand implements ICommand {
  constructor(
    private facade: HostSwitchFacade,
    private profileName: string
  ) {}

  async execute(): Promise<ICommandResult> {
    return this.facade.editProfile(this.profileName);
  }
}
