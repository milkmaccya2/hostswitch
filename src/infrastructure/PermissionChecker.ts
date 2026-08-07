import { spawn } from 'node:child_process';
import * as fs from 'fs-extra';
import type { IPermissionChecker, SudoResult } from '../interfaces';

export class PermissionChecker implements IPermissionChecker {
  /**
   * 書き込み可否を問い合わせるだけで、対象ファイルには一切触れない。
   */
  async canWriteToFile(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath, fs.constants.W_OK);
      return true;
    } catch (_error) {
      return false;
    }
  }

  requiresSudo(filePath?: string): boolean {
    // rootで実行中なら昇格は不要
    if (this.isRunningAsSudo()) {
      return false;
    }

    // 対象が分かっていて、かつ既に書けるなら昇格を求めない
    if (filePath) {
      try {
        fs.accessSync(filePath, fs.constants.W_OK);
        return false;
      } catch (_error) {
        return true;
      }
    }

    return true;
  }

  async checkPermissions(path: string): Promise<boolean> {
    // ファイルへの書き込み権限をチェック
    return await this.canWriteToFile(path);
  }

  isRunningAsSudo(): boolean {
    // 実効ユーザIDだけで判定する。SUDO_USER は `sudo -s` 後のシェルから
    // 起動した非特権プロセスにも引き継がれるため、昇格済みの証拠にならない。
    const euid = process.geteuid?.() ?? process.getuid?.();
    return euid === 0;
  }

  async rerunWithSudo(args: string[]): Promise<SudoResult> {
    return new Promise((resolve) => {
      const command = this.buildSudoCommand(args);

      const child = spawn(command[0], command.slice(1), {
        stdio: 'inherit',
        env: process.env,
      });

      child.on('exit', (code) => {
        resolve({
          success: code === 0,
          message: code === 0 ? 'Operation completed successfully.' : 'Operation failed with sudo.',
        });
      });

      child.on('error', (error) => {
        resolve({
          success: false,
          message: `Failed to execute sudo: ${error.message}`,
        });
      });
    });
  }

  private buildSudoCommand(args: string[]): string[] {
    const executablePath = process.argv[0]; // node path
    const scriptPath = process.argv[1]; // hostswitch.js path

    // npm run 経由かどうかは npm_lifecycle_event の有無で判断する。
    // scriptPath.includes('npm') はパスに "npm" を含むだけで誤検出する。
    if (process.env.npm_lifecycle_event) {
      // npm start -- switch profile -> sudo npm start -- switch profile
      return ['sudo', 'npm', 'start', '--', ...args];
    }

    // direct execution -> sudo node hostswitch.js switch profile
    return ['sudo', executablePath, scriptPath, ...args];
  }
}
