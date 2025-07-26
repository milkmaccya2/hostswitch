import type { ICommand, ICommandResult } from '../../interfaces';
import type { HostSwitchFacade } from '../HostSwitchFacade';

export class DeleteProfileCommand implements ICommand {
  constructor(
    private facade: HostSwitchFacade,
    private profileName: string,
    private force: boolean = false
  ) {}

  async execute(): Promise<ICommandResult> {
    return this.facade.deleteProfile(this.profileName, this.force);
  }
}
