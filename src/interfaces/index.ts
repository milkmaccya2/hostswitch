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
  renameSync(src: string, dest: string): void;
  unlinkSync(path: string): void;
  existsSync(path: string): boolean;
  ensureDirSync(path: string): void;
  readdirSync(path: string): string[];
  readJsonSync<T = unknown>(path: string): T;
  writeJsonSync<T = unknown>(path: string, data: T): void;
}

export interface ILogger {
  info(message: string): void;
  warn(message: string): void;
  warning(message: string): void;
  error(message: string): void;
  success(message: string): void;
  dim(message: string): void;
  bold(message: string): void;
  debug(message: string): void;
}

export interface IProcessManager {
  executeEditor(editor: string, filePath: string): Promise<void>;
  openEditor(editor: string, filePath: string): Promise<void>;
}

export interface DnsFlushResult {
  /** フラッシュを試みたか。該当コマンドが無い環境では false */
  attempted: boolean;
  success: boolean;
  /** 実行したコマンド。表示用 */
  command?: string;
  message?: string;
}

export type CommandRunner = (
  command: string,
  args: string[]
) => { status: number | null; error?: Error };

export interface IDnsCacheFlusher {
  flush(): Promise<DnsFlushResult>;
}

export interface IPermissionChecker {
  canWriteToFile(filePath: string): Promise<boolean>;
  requiresSudo(filePath?: string): boolean;
  checkPermissions(path: string): Promise<boolean>;
  isRunningAsSudo(): boolean;
  rerunWithSudo(args: string[]): Promise<SudoResult>;
}

/** sudo で自分自身を再実行する。実装は PermissionChecker.rerunWithSudo 一箇所のみ */
export type Elevate = (args: string[]) => Promise<SudoResult>;

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
  dnsFlush?: DnsFlushResult;
}

export interface SwitchOptions {
  /** false でDNSキャッシュのフラッシュを行わない。既定は行う */
  flushDns?: boolean;
}

export interface BackupResult {
  success: boolean;
  /** 退避先。skipped の場合は無い */
  path?: string;
  /** hostsファイルが存在せず、退避するものが無かった */
  skipped?: boolean;
  message?: string;
}

export interface BackupInfo {
  /** restore で指定する識別子。ファイル名のタイムスタンプ部分 */
  id: string;
  /** バックアップファイルの絶対パス */
  path: string;
  /** バックアップが作られた日時。ファイル名から復元できない場合は null */
  createdAt: Date | null;
}

export interface StatusInfo {
  currentProfile: string | null;
  hostsPath: string;
  /** current があり、その checksum と実ファイルが食い違っているか */
  modified: boolean;
  /** 最後に切り替えた日時。current が無ければ null */
  updatedAt: string | null;
  /** 直近のバックアップ。無ければ null */
  latestBackup: BackupInfo | null;
}

export interface RestoreResult {
  success: boolean;
  message?: string;
  /** 復元前の hosts を退避した先 */
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
  data?: unknown;
  requiresConfirmation?: boolean;
  requiresSudo?: boolean;
  // 表示用の文字列。sudo で何を実行するかの判断には使わない
  sudoCommand?: string;
  // sudo で再実行する hostswitch の引数
  sudoArgs?: string[];
  requiresApply?: boolean;
  profileName?: string;
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
