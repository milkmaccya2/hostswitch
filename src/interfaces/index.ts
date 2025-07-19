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
  error(message: string): void;
  success(message: string): void;
  dim(message: string): void;
  bold(message: string): void;
}

export interface IProcessManager {
  executeEditor(editor: string, filePath: string): Promise<void>;
}

export interface IPermissionChecker {
  canWriteToFile(filePath: string): Promise<boolean>;
  requiresSudo(filePath: string): Promise<boolean>;
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
}