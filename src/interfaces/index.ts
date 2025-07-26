export interface ProfileData {
  profile: string | null;
  checksum: string | null;
  updatedAt: string;
}

export interface IFileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  readFileSync(path: string): string;
  writeFileSync(path: string, content: string): void;
  copySync(src: string, dest: string): void;
  unlinkSync(path: string): void;
  existsSync(path: string): boolean;
  ensureDirSync(path: string): void;
  readdirSync(path: string): string[];
  readJsonSync(path: string): any;
  writeJsonSync(path: string, data: any): void;
}

export interface ILogger {
  info(message: string): void;
  warn(message: string): void;
  warning(message: string): void;
  error(message: string): void;
  success(message: string): void;
  dim(message: string): void;
  bold(message: string): void;
}

export interface IProcessManager {
  executeEditor(editor: string, filePath: string): Promise<void>;
  openEditor(editor: string, filePath: string): Promise<void>;
}

export interface IPermissionChecker {
  canWriteToFile(filePath: string): Promise<boolean>;
  requiresSudo(filePath?: string): boolean;
  checkPermissions(path: string): Promise<boolean>;
  isRunningAsSudo(): boolean;
  rerunWithSudo(args: string[]): Promise<SudoResult>;
}

export interface SudoResult {
  success: boolean;
  message?: string;
}

export interface HostSwitchConfig {
  configDir: string;
  profilesDir: string;
  backupDir: string;
  hostsPath: string;
  currentProfileFile: string;
}

export interface SwitchResult {
  success: boolean;
  message?: string;
  backupPath?: string;
  requiresSudo?: boolean;
}

export interface CreateProfileResult {
  success: boolean;
  message?: string;
}

export interface ProfileInfo {
  name: string;
  isCurrent: boolean;
  isActive?: boolean;
}

export interface DeleteResult {
  success: boolean;
  message?: string;
}

export interface ProfileContentResult {
  success: boolean;
  content?: string;
  message?: string;
}

export interface ICommand {
  execute(): Promise<ICommandResult>;
}

export interface ICommandResult {
  success: boolean;
  message?: string;
  data?: any;
  requiresConfirmation?: boolean;
  requiresSudo?: boolean;
  sudoCommand?: string;
}

export type MessageType = 'info' | 'error' | 'success' | 'warning';

export interface Choice<T> {
  name: string;
  value: T;
}

export interface IUserInterface {
  showMessage(message: string, type?: MessageType): void;
  promptConfirm(message: string): Promise<boolean>;
  promptSelect<T>(message: string, choices: Choice<T>[]): Promise<T>;
  promptInput(message: string, validator?: (input: string) => boolean | string): Promise<string>;
  handleCommandResult(result: ICommandResult): Promise<void>;
}
