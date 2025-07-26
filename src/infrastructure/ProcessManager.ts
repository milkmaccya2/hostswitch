import { execSync } from 'child_process';
import { IProcessManager } from '../interfaces';

export class ProcessManager implements IProcessManager {
  async executeEditor(editor: string, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        execSync(`${editor} ${filePath}`, { stdio: 'inherit' });
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  async openEditor(editor: string, filePath: string): Promise<void> {
    return this.executeEditor(editor, filePath);
  }
}