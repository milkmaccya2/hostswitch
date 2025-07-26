import * as fs from 'fs-extra';
import type { IFileSystem } from '../interfaces';

export class FileSystemAdapter implements IFileSystem {
  async readFile(path: string): Promise<string> {
    return fs.readFile(path, 'utf8');
  }

  async writeFile(path: string, content: string): Promise<void> {
    return fs.writeFile(path, content, 'utf8');
  }

  readFileSync(path: string): string {
    return fs.readFileSync(path, 'utf8');
  }

  writeFileSync(path: string, content: string): void {
    fs.writeFileSync(path, content, 'utf8');
  }

  copySync(src: string, dest: string): void {
    fs.copySync(src, dest);
  }

  unlinkSync(path: string): void {
    fs.unlinkSync(path);
  }

  existsSync(path: string): boolean {
    return fs.existsSync(path);
  }

  ensureDirSync(path: string): void {
    fs.ensureDirSync(path);
  }

  readdirSync(path: string): string[] {
    return fs.readdirSync(path);
  }

  readJsonSync(path: string): any {
    return fs.readJsonSync(path);
  }

  writeJsonSync(path: string, data: any): void {
    fs.writeJsonSync(path, data);
  }
}
