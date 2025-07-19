import { HostSwitchService } from '../../core/HostSwitchService';
import { ILogger, IProcessManager } from '../../interfaces';

export class CommandHandler {
  constructor(
    private service: HostSwitchService,
    private logger: ILogger,
    private processManager: IProcessManager
  ) {}

  async handleList(): Promise<void> {
    const profiles = this.service.getProfiles();
    
    if (profiles.length === 0) {
      this.logger.warn('No profiles found.');
      return;
    }

    this.logger.bold('Available profiles:');
    profiles.forEach(profile => {
      const marker = profile.isCurrent ? ' [current]' : '';
      this.logger.info(`  - ${profile.name}${marker}`);
    });
  }

  async handleCreate(name: string, fromCurrent: boolean = false): Promise<void> {
    const result = this.service.createProfile(name, fromCurrent);
    
    if (result.success) {
      this.logger.success(result.message!);
    } else {
      this.logger.error(result.message!);
    }
  }

  async handleSwitch(name: string): Promise<void> {
    const result = await this.service.switchProfile(name);
    
    if (result.success) {
      if (result.backupPath) {
        this.logger.dim(`Current hosts backed up to: ${result.backupPath}`);
      }
      this.logger.success(result.message!);
    } else {
      this.logger.error(result.message!);
    }
  }

  async handleDelete(name: string): Promise<void> {
    const result = this.service.deleteProfile(name);
    
    if (result.success) {
      this.logger.success(result.message);
    } else {
      this.logger.error(result.message);
    }
  }

  async handleShow(name: string): Promise<void> {
    const result = this.service.getProfileContent(name);
    
    if (result.success) {
      this.logger.bold(`Content of profile '${name}':`);
      this.logger.dim('-'.repeat(40));
      console.log(result.content);
      this.logger.dim('-'.repeat(40));
    } else {
      this.logger.error(result.message!);
    }
  }

  async handleEdit(name: string): Promise<void> {
    if (!this.service.profileExists(name)) {
      this.logger.error(`Profile '${name}' does not exist.`);
      return;
    }

    const editor = process.env.EDITOR || 'vi';
    try {
      const profilePath = this.service.getProfilePath(name);
      await this.processManager.executeEditor(editor, profilePath);
    } catch (err) {
      const error = err as Error;
      this.logger.error(`Error opening editor: ${error.message}`);
    }
  }
}