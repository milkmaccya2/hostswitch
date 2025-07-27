import type {
  IFileSystem,
  ILogger,
  IPermissionChecker,
  IProcessManager,
  SudoResult,
} from '../interfaces';

export class MockFileSystem implements IFileSystem {
  private files = new Map<string, string>();
  private directories = new Set<string>();
  public calls: Array<{ method: string; args: any[] }> = [];
  private throwOnNext = false;
  private nextError: Error = new Error();

  private recordCall(method: string, ...args: any[]) {
    this.calls.push({ method, args });
  }

  async readFile(path: string): Promise<string> {
    this.recordCall('readFile', path);
    const content = this.files.get(path);
    if (content === undefined) {
      throw new Error(`File not found: ${path}`);
    }
    return content;
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.recordCall('writeFile', path, content);
    this.files.set(path, content);
  }

  readFileSync(path: string): string {
    this.recordCall('readFileSync', path);
    const content = this.files.get(path);
    if (content === undefined) {
      throw new Error(`File not found: ${path}`);
    }
    return content;
  }

  writeFileSync(path: string, content: string): void {
    this.recordCall('writeFileSync', path, content);
    if (this.throwOnNext) {
      this.throwOnNext = false;
      throw this.nextError;
    }
    this.files.set(path, content);
  }

  copySync(src: string, dest: string): void {
    this.recordCall('copySync', src, dest);
    if (this.throwOnNext) {
      this.throwOnNext = false;
      throw this.nextError;
    }
    const content = this.files.get(src);
    if (content === undefined) {
      throw new Error(`Source file not found: ${src}`);
    }
    this.files.set(dest, content);
  }

  unlinkSync(path: string): void {
    this.recordCall('unlinkSync', path);
    if (this.throwOnNext) {
      this.throwOnNext = false;
      throw this.nextError;
    }
    if (!this.files.has(path)) {
      throw new Error(`File not found: ${path}`);
    }
    this.files.delete(path);
  }

  existsSync(path: string): boolean {
    this.recordCall('existsSync', path);
    return this.files.has(path) || this.directories.has(path);
  }

  ensureDirSync(path: string): void {
    this.recordCall('ensureDirSync', path);
    this.directories.add(path);
  }

  readdirSync(path: string): string[] {
    this.recordCall('readdirSync', path);
    // パス配下のファイル一覧を返す（簡略実装）
    const files: string[] = [];
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(path + '/')) {
        const fileName = filePath.substring(path.length + 1);
        if (!fileName.includes('/')) {
          files.push(fileName);
        }
      }
    }
    return files;
  }

  readJsonSync(path: string): any {
    this.recordCall('readJsonSync', path);
    const content = this.readFileSync(path);
    return JSON.parse(content);
  }

  writeJsonSync(path: string, data: any): void {
    this.recordCall('writeJsonSync', path, data);
    this.writeFileSync(path, JSON.stringify(data, null, 2));
  }

  setFile(path: string, content: string): void {
    this.files.set(path, content);
  }

  getFile(path: string): string | undefined {
    return this.files.get(path);
  }

  clear(): void {
    this.files.clear();
    this.directories.clear();
    this.calls = [];
  }

  getCalls(method?: string): Array<{ method: string; args: any[] }> {
    if (method) {
      return this.calls.filter((call) => call.method === method);
    }
    return this.calls;
  }

  setThrowErrorOnNext(error: Error): void {
    this.throwOnNext = true;
    this.nextError = error;
  }
}

export class MockLogger implements ILogger {
  public messages: Array<{ level: string; message: string }> = [];

  info(message: string): void {
    this.messages.push({ level: 'info', message });
  }

  warn(message: string): void {
    this.messages.push({ level: 'warn', message });
  }

  warning(message: string): void {
    this.messages.push({ level: 'warning', message });
  }

  error(message: string): void {
    this.messages.push({ level: 'error', message });
  }

  success(message: string): void {
    this.messages.push({ level: 'success', message });
  }

  dim(message: string): void {
    this.messages.push({ level: 'dim', message });
  }

  bold(message: string): void {
    this.messages.push({ level: 'bold', message });
  }

  debug(message: string, ...args: any[]): void {
    this.messages.push({ level: 'debug', message: `${message} ${args.join(' ')}` });
  }

  clear(): void {
    this.messages = [];
  }

  getMessages(level?: string): Array<{ level: string; message: string }> {
    if (level) {
      return this.messages.filter((msg) => msg.level === level);
    }
    return this.messages;
  }

  hasMessage(message: string, level?: string): boolean {
    return this.messages.some(
      (msg) => msg.message.includes(message) && (!level || msg.level === level)
    );
  }
}

export class MockProcessManager implements IProcessManager {
  public calls: Array<{ editor: string; filePath: string }> = [];
  public shouldThrow = false;
  public errorMessage = 'Mock process error';

  async executeEditor(editor: string, filePath: string): Promise<void> {
    this.calls.push({ editor, filePath });

    if (this.shouldThrow) {
      throw new Error(this.errorMessage);
    }
  }

  async openEditor(editor: string, filePath: string): Promise<void> {
    return this.executeEditor(editor, filePath);
  }

  clear(): void {
    this.calls = [];
    this.shouldThrow = false;
  }

  setThrowError(shouldThrow: boolean, message?: string): void {
    this.shouldThrow = shouldThrow;
    if (message) {
      this.errorMessage = message;
    }
  }
}

export class MockPermissionChecker implements IPermissionChecker {
  public canWriteToFileResult = true;
  public requiresSudoResult = false;
  public isRunningAsSudoResult = false;
  public rerunWithSudoResult: SudoResult = { success: true, message: 'Success' };
  public calls: Array<{ method: string; args: any[] }> = [];

  private recordCall(method: string, ...args: any[]) {
    this.calls.push({ method, args });
  }

  async canWriteToFile(filePath: string): Promise<boolean> {
    this.recordCall('canWriteToFile', filePath);
    return this.canWriteToFileResult;
  }

  requiresSudo(filePath?: string): boolean {
    this.recordCall('requiresSudo', filePath);
    return this.requiresSudoResult;
  }

  async checkPermissions(path: string): Promise<boolean> {
    this.recordCall('checkPermissions', path);
    return this.canWriteToFileResult;
  }

  isRunningAsSudo(): boolean {
    this.recordCall('isRunningAsSudo');
    return this.isRunningAsSudoResult;
  }

  async rerunWithSudo(args: string[]): Promise<SudoResult> {
    this.recordCall('rerunWithSudo', args);
    return this.rerunWithSudoResult;
  }

  clear(): void {
    this.calls = [];
    this.canWriteToFileResult = true;
    this.requiresSudoResult = false;
    this.isRunningAsSudoResult = false;
    this.rerunWithSudoResult = { success: true, message: 'Success' };
  }

  setCanWriteToFile(result: boolean): void {
    this.canWriteToFileResult = result;
  }

  setRequiresSudo(result: boolean): void {
    this.requiresSudoResult = result;
  }

  setRunningAsSudo(result: boolean): void {
    this.isRunningAsSudoResult = result;
  }

  setRerunWithSudoResult(result: SudoResult): void {
    this.rerunWithSudoResult = result;
  }
}
