import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import updateNotifier from 'update-notifier';
import type { ILogger } from '../interfaces';

export interface UpdateCheckOptions {
  checkNow?: boolean;
  silent?: boolean;
}

interface PackageJson {
  name: string;
  version: string;
}

export class UpdateChecker {
  private pkg: PackageJson;
  private notifier: ReturnType<typeof updateNotifier>;

  constructor(private logger: ILogger) {
    const packageJsonPath = join(__dirname, '../../package.json');
    this.pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    this.notifier = updateNotifier({
      pkg: this.pkg,
      updateCheckInterval: 1000 * 60 * 60 * 24, // 24 hours
    });
  }

  checkForUpdate(options: UpdateCheckOptions = {}): void {
    try {
      // Force check if requested
      if (options.checkNow) {
        this.notifier.check();
      }

      // Check if update is available
      if (this.notifier.update && !options.silent) {
        this.notifier.notify({
          defer: false,
          isGlobal: true,
          boxenOptions: {
            padding: 1,
            margin: 1,
            align: 'center',
            borderColor: 'yellow',
            borderStyle: 'round',
          },
        });
      }
    } catch (error) {
      // Silently fail - don't interrupt user's workflow
      if (!options.silent) {
        this.logger.debug(`Update check failed: ${error}`);
      }
    }
  }

  checkForUpdateAsync(): void {
    // Run update check asynchronously to not block CLI startup
    setImmediate(() => {
      this.checkForUpdate({ silent: true });
    });
  }

  getUpdateInfo(): { current: string; latest?: string; available: boolean } {
    return {
      current: this.pkg.version,
      latest: this.notifier.update?.latest,
      available: !!this.notifier.update,
    };
  }
}
