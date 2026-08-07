import { spawn } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionChecker } from '../PermissionChecker';

vi.mock('child_process');
vi.mock('fs-extra', () => ({
  access: vi.fn(),
  accessSync: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  copy: vi.fn(),
  unlink: vi.fn(),
  constants: {
    W_OK: 2,
  },
}));

describe('PermissionChecker', () => {
  let permissionChecker: PermissionChecker;
  let mockSpawn: ReturnType<typeof vi.mocked<typeof spawn>>;
  let mockFs: typeof import('fs-extra');

  beforeEach(async () => {
    permissionChecker = new PermissionChecker();
    mockSpawn = vi.mocked(spawn);
    mockFs = await vi.importMock('fs-extra');

    // デフォルトのモック設定をリセット
    vi.clearAllMocks();
  });

  afterEach(() => {
    // プロセス環境変数をクリア
    delete process.env.SUDO_USER;
    vi.restoreAllMocks();
  });

  describe('canWriteToFile()', () => {
    it('書き込み可能な場合はtrueを返す', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const result = await permissionChecker.canWriteToFile('/test/file');

      expect(result).toBe(true);
      expect(mockFs.access).toHaveBeenCalledWith('/test/file', mockFs.constants.W_OK);
    });

    it('書き込み不可の場合はfalseを返す', async () => {
      mockFs.access.mockRejectedValue(Object.assign(new Error('EACCES'), { code: 'EACCES' }));

      const result = await permissionChecker.canWriteToFile('/test/file');

      expect(result).toBe(false);
    });

    it('対象ファイルへの書き込みを一切行わない', async () => {
      mockFs.access.mockResolvedValue(undefined);

      await permissionChecker.canWriteToFile('/etc/hosts');

      expect(mockFs.writeFile).not.toHaveBeenCalled();
      expect(mockFs.copy).not.toHaveBeenCalled();
      expect(mockFs.unlink).not.toHaveBeenCalled();
    });
  });

  describe('requiresSudo()', () => {
    it('root実行中は書き込み権限に関係なくfalseを返す', () => {
      const originalGeteuid = process.geteuid;
      process.geteuid = () => 0;

      expect(permissionChecker.requiresSudo('/etc/hosts')).toBe(false);

      process.geteuid = originalGeteuid;
    });

    it('非rootでも対象に書き込めるならfalseを返す', () => {
      const originalGeteuid = process.geteuid;
      process.geteuid = () => 1000;
      mockFs.accessSync.mockReturnValue(undefined);

      expect(permissionChecker.requiresSudo('/etc/hosts')).toBe(false);

      process.geteuid = originalGeteuid;
    });

    it('非rootで書き込めない場合はtrueを返す', () => {
      const originalGeteuid = process.geteuid;
      process.geteuid = () => 1000;
      mockFs.accessSync.mockImplementation(() => {
        throw new Error('EACCES');
      });

      expect(permissionChecker.requiresSudo('/etc/hosts')).toBe(true);

      process.geteuid = originalGeteuid;
    });

    it('対象が指定されていない場合は非rootならtrueを返す', () => {
      const originalGeteuid = process.geteuid;
      process.geteuid = () => 1000;

      expect(permissionChecker.requiresSudo()).toBe(true);

      process.geteuid = originalGeteuid;
    });
  });

  describe('isRunningAsSudo()', () => {
    it('実効UIDが0の場合はtrueを返す', () => {
      const originalGeteuid = process.geteuid;
      process.geteuid = () => 0;

      expect(permissionChecker.isRunningAsSudo()).toBe(true);

      process.geteuid = originalGeteuid;
    });

    it('SUDO_USERだけが設定されていてもfalseを返す', () => {
      // `sudo -s` 後のシェルから起動した非特権プロセスにも SUDO_USER は
      // 引き継がれるため、昇格済みの証拠として使ってはいけない
      const originalGeteuid = process.geteuid;
      process.geteuid = () => 1000;
      process.env.SUDO_USER = 'testuser';

      expect(permissionChecker.isRunningAsSudo()).toBe(false);

      process.geteuid = originalGeteuid;
    });

    it('非rootかつSUDO_USERなしの場合はfalseを返す', () => {
      const originalGeteuid = process.geteuid;
      process.geteuid = () => 1000;
      delete process.env.SUDO_USER;

      expect(permissionChecker.isRunningAsSudo()).toBe(false);

      process.geteuid = originalGeteuid;
    });
  });

  describe('rerunWithSudo()', () => {
    it('sudoコマンドが成功した場合は成功結果を返す', async () => {
      const mockChild = {
        on: vi.fn((event: string, callback: (code: number | null) => void) => {
          if (event === 'exit') {
            // 成功をシミュレート
            setTimeout(() => callback(0), 10);
          }
        }),
      } as unknown as ReturnType<typeof spawn>;
      mockSpawn.mockReturnValue(mockChild);

      const result = await permissionChecker.rerunWithSudo(['switch', 'dev']);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Operation completed successfully.');
      expect(mockSpawn).toHaveBeenCalledWith('sudo', expect.arrayContaining(['switch', 'dev']), {
        stdio: 'inherit',
        env: process.env,
      });
    });

    it('sudoコマンドが失敗した場合は失敗結果を返す', async () => {
      const mockChild = {
        on: vi.fn((event: string, callback: (code: number | null) => void) => {
          if (event === 'exit') {
            // 失敗をシミュレート
            setTimeout(() => callback(1), 10);
          }
        }),
      } as unknown as ReturnType<typeof spawn>;
      mockSpawn.mockReturnValue(mockChild);

      const result = await permissionChecker.rerunWithSudo(['switch', 'dev']);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Operation failed with sudo.');
    });

    it('spawnでエラーが発生した場合は失敗結果を返す', async () => {
      const mockChild = {
        on: vi.fn(
          (event: string, callback: ((code: number | null) => void) | ((error: Error) => void)) => {
            if (event === 'error') {
              // エラーをシミュレート
              setTimeout(
                () => (callback as (error: Error) => void)(new Error('Command not found')),
                10
              );
            }
          }
        ),
      } as unknown as ReturnType<typeof spawn>;
      mockSpawn.mockReturnValue(mockChild);

      const result = await permissionChecker.rerunWithSudo(['switch', 'dev']);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to execute sudo: Command not found');
    });

    it('npm経由での実行を検出してsudo npmコマンドを構築', async () => {
      // npm経由の実行をシミュレート
      const originalArgv = process.argv;
      const originalEnv = process.env.npm_lifecycle_event;
      process.argv = ['/usr/bin/node', '/path/to/npm/script'];
      process.env.npm_lifecycle_event = 'start';

      const mockChild = {
        on: vi.fn((event: string, callback: (code: number | null) => void) => {
          if (event === 'exit') {
            setTimeout(() => callback(0), 10);
          }
        }),
      } as unknown as ReturnType<typeof spawn>;
      mockSpawn.mockReturnValue(mockChild);

      await permissionChecker.rerunWithSudo(['switch', 'dev']);

      expect(mockSpawn).toHaveBeenCalledWith(
        'sudo',
        ['npm', 'start', '--', 'switch', 'dev'],
        expect.any(Object)
      );

      // 復元
      process.argv = originalArgv;
      if (originalEnv) {
        process.env.npm_lifecycle_event = originalEnv;
      } else {
        delete process.env.npm_lifecycle_event;
      }
    });

    it('直接実行の場合はsudo nodeコマンドを構築', async () => {
      // 直接実行をシミュレート
      const originalArgv = process.argv;
      process.argv = ['/usr/bin/node', '/path/to/hostswitch.js'];
      const savedLifecycle = process.env.npm_lifecycle_event;
      delete process.env.npm_lifecycle_event;

      const mockChild = {
        on: vi.fn((event: string, callback: (code: number | null) => void) => {
          if (event === 'exit') {
            setTimeout(() => callback(0), 10);
          }
        }),
      } as unknown as ReturnType<typeof spawn>;
      mockSpawn.mockReturnValue(mockChild);

      await permissionChecker.rerunWithSudo(['switch', 'dev']);

      expect(mockSpawn).toHaveBeenCalledWith(
        'sudo',
        ['/usr/bin/node', '/path/to/hostswitch.js', 'switch', 'dev'],
        expect.any(Object)
      );

      // 復元
      process.argv = originalArgv;
      if (savedLifecycle) {
        process.env.npm_lifecycle_event = savedLifecycle;
      }
    });
  });
});
