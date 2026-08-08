import type { ICommand, ICommandResult, IUserInterface } from '../../interfaces';
import type { HostSwitchFacade } from '../HostSwitchFacade';

export class DeleteProfileCommand implements ICommand {
  constructor(
    private facade: HostSwitchFacade,
    private profileName: string,
    private force: boolean = false,
    private ui?: IUserInterface
  ) {}

  async execute(): Promise<ICommandResult> {
    if (this.force) {
      return this.facade.deleteProfile(this.profileName, true);
    }

    // TTY があれば確認プロンプトを出し、その場で削除まで済ませる。
    // --force はそのプロンプトを飛ばすフラグとして働く。
    if (this.ui?.canConfirmInteractively()) {
      const confirmed = await this.ui.promptConfirm(`Delete profile "${this.profileName}"?`);
      if (!confirmed) {
        return { success: true, message: 'Deletion cancelled' };
      }
      return this.facade.deleteProfile(this.profileName, true);
    }

    // 非対話（CI・パイプ）では確認できないので --force を要求する
    return this.facade.deleteProfile(this.profileName, false);
  }
}
