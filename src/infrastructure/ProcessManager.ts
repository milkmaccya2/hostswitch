import { execSync } from 'node:child_process';
import type { IProcessManager } from '../interfaces';

export class ProcessManager implements IProcessManager {
  async executeEditor(editor: string, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // editor は `code --wait` のようにフラグを含みうるのでシェルに解釈させる。
        // パスは解釈させたくないので引用する
        execSync(`${editor} ${this.quotePath(filePath)}`, { stdio: 'inherit' });
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  async openEditor(editor: string, filePath: string): Promise<void> {
    return this.executeEditor(editor, filePath);
  }

  private quotePath(filePath: string): string {
    if (process.platform === 'win32') {
      return `"${filePath}"`;
    }

    // シングルクォートで囲み、含まれるシングルクォートは一度閉じて連結する
    return `'${filePath.replace(/'/g, "'\\''")}'`;
  }
}
