import type { ICommand, ICommandResult } from '../../interfaces';
import type { HostSwitchFacade } from '../HostSwitchFacade';

export class RestoreBackupCommand implements ICommand {
  constructor(
    private facade: HostSwitchFacade,
    private backupId?: string
  ) {}

  async execute(): Promise<ICommandResult> {
    return this.facade.restoreBackup(this.backupId);
  }
}
