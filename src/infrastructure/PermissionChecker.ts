import { spawn } from 'child_process';
import * as fs from 'fs-extra';
import type { IPermissionChecker, SudoResult } from '../interfaces';

export class PermissionChecker implements IPermissionChecker {
  async canWriteToFile(filePath: string): Promise<boolean> {
    try {
      // copySync操作に必要な権限をテストする
      // 一時的なバックアップファイルでcopySync操作をシミュレート
      const tempPath = filePath + '.hostswitch-test';

      // 元ファイルの内容を読み取り
      const originalContent = await fs.readFile(filePath, 'utf8');

      // 一時ファイルに書き込み
      await fs.writeFile(tempPath, originalContent);

      // copySync操作をテスト（実際にunlink/copyを実行）
      await fs.copy(tempPath, filePath, { overwrite: true });

      // テスト用一時ファイルを削除
      await fs.unlink(tempPath);

      return true;
    } catch (error) {
      // EACCES (Permission denied) またはその他のエラーの場合はfalse
      return false;
    }
  }

  requiresSudo(_filePath?: string): boolean {
    // sudoで実行中の場合は不要
    if (this.isRunningAsSudo()) {
      return false;
    }

    // デフォルトでhostsファイルへの書き込みはsudoが必要
    return true;
  }

  async checkPermissions(path: string): Promise<boolean> {
    // ファイルへの書き込み権限をチェック
    return await this.canWriteToFile(path);
  }

  isRunningAsSudo(): boolean {
    // process.getuid()が0（root）の場合、またはSUDO_USER環境変数が設定されている場合
    return process.getuid?.() === 0 || process.env.SUDO_USER !== undefined;
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

    // npm経由で実行されている場合の検出
    if (scriptPath.includes('npm') || process.env.npm_execpath) {
      // npm start -- switch profile -> sudo npm start -- switch profile
      return ['sudo', 'npm', 'start', '--', ...args];
    } else {
      // direct execution -> sudo node hostswitch.js switch profile
      return ['sudo', executablePath, scriptPath, ...args];
    }
  }
}
