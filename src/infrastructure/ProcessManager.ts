import { spawnSync } from 'node:child_process';
import type { IProcessManager } from '../interfaces';

export class ProcessManager implements IProcessManager {
  async executeEditor(editor: string, filePath: string): Promise<void> {
    // シェルを経由しないよう引数配列で渡す。EDITOR="code --wait" のように
    // 引数つきで指定された場合に備え、先頭をコマンド、残りを引数として扱う。
    const [command, ...args] = editor.trim().split(/\s+/);

    if (!command) {
      throw new Error('No editor specified.');
    }

    const result = spawnSync(command, [...args, filePath], { stdio: 'inherit' });

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      throw new Error(`Editor '${command}' exited with code ${result.status}.`);
    }
  }

  async openEditor(editor: string, filePath: string): Promise<void> {
    return this.executeEditor(editor, filePath);
  }
}
