import type { ICommand, ICommandResult } from '../../interfaces';
import type { HostSwitchFacade } from '../HostSwitchFacade';

export class SwitchProfileCommand implements ICommand {
  constructor(
    private facade: HostSwitchFacade,
    private profileName: string,
    private flushDns?: boolean
  ) {}

  async execute(): Promise<ICommandResult> {
    return this.facade.switchProfile(this.profileName, { flushDns: this.flushDns });
  }
}
