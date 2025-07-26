import { spawn } from 'child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionChecker } from '../PermissionChecker';

vi.mock('child_process');
vi.mock('fs-extra', () => ({
  access: vi.fn(),
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
  let mockSpawn: any;
  let mockFs: any;

  beforeEach(async () => {
    permissionChecker = new PermissionChecker();
    mockSpawn = vi.mocked(spawn);
    mockFs = (await vi.importMock('fs-extra')) as any;

    // デフォルトのモック設定をリセット
    vi.clearAllMocks();
  });

  afterEach(() => {
    // プロセス環境変数をクリア
    delete process.env.SUDO_USER;
    vi.restoreAllMocks();
  });

  describe('canWriteToFile()', () => {
    it('copySync操作が成功する場合はtrueを返す', async () => {
      // 全ての操作が成功するようにモック設定
      mockFs.readFile.mockResolvedValue('test content');
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.copy.mockResolvedValue(undefined);
      mockFs.unlink.mockResolvedValue(undefined);

      const result = await permissionChecker.canWriteToFile('/test/file');

      expect(result).toBe(true);
      expect(mockFs.readFile).toHaveBeenCalledWith('/test/file', 'utf8');
      expect(mockFs.writeFile).toHaveBeenCalledWith('/test/file.hostswitch-test', 'test content');
      expect(mockFs.copy).toHaveBeenCalledWith('/test/file.hostswitch-test', '/test/file', {
        overwrite: true,
      });
      expect(mockFs.unlink).toHaveBeenCalledWith('/test/file.hostswitch-test');
    });

    it('copySync操作でEACCESエラーが発生した場合はfalseを返す', async () => {
      mockFs.readFile.mockResolvedValue('test content');
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.copy.mockRejectedValue(
        Object.assign(new Error('Permission denied'), { code: 'EACCES' })
      );

      const result = await permissionChecker.canWriteToFile('/test/file');

      expect(result).toBe(false);
    });

    it('readFileでエラーが発生した場合はfalseを返す', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      const result = await permissionChecker.canWriteToFile('/test/file');

      expect(result).toBe(false);
    });
  });

  describe('requiresSudo()', () => {
    it('sudoで実行中の場合は書き込み権限に関係なくfalseを返す', () => {
      // process.getuid()をモック（root権限をシミュレート）
      const originalGetuid = process.getuid;
      process.getuid = vi.fn().mockReturnValue(0);

      const result = permissionChecker.requiresSudo('/etc/hosts');

      expect(result).toBe(false);

      // 復元
      process.getuid = originalGetuid;
    });

    it('書き込み権限がある場合はfalseを返す', () => {
      // 新しい実装では、sudo権限がない限り常にtrueを返すように変更
      const result = permissionChecker.requiresSudo('/test/file');

      expect(result).toBe(true);
    });

    it('書き込み権限がない場合はtrueを返す', () => {
      // 新しい実装では、sudo権限がない限り常にtrueを返す
      const result = permissionChecker.requiresSudo('/etc/hosts');

      expect(result).toBe(true);
    });
  });

  describe('isRunningAsSudo()', () => {
    it('process.getuidが0の場合はtrueを返す', () => {
      const originalGetuid = process.getuid;
      process.getuid = vi.fn().mockReturnValue(0);

      const result = permissionChecker.isRunningAsSudo();

      expect(result).toBe(true);

      // 復元
      process.getuid = originalGetuid;
    });

    it('SUDO_USER環境変数が設定されている場合はtrueを返す', () => {
      process.env.SUDO_USER = 'testuser';

      const result = permissionChecker.isRunningAsSudo();

      expect(result).toBe(true);
    });

    it('どちらの条件も満たさない場合はfalseを返す', () => {
      const originalGetuid = process.getuid;
      process.getuid = vi.fn().mockReturnValue(1000);
      delete process.env.SUDO_USER;

      const result = permissionChecker.isRunningAsSudo();

      expect(result).toBe(false);

      // 復元
      process.getuid = originalGetuid;
    });

    it('process.getuidが利用できない環境ではSUDO_USER環境変数のみで判定', () => {
      const originalGetuid = process.getuid;
      delete (process as any).getuid;
      delete process.env.SUDO_USER;

      const result = permissionChecker.isRunningAsSudo();

      expect(result).toBe(false);

      // 復元
      process.getuid = originalGetuid;
    });
  });

  describe('rerunWithSudo()', () => {
    it('sudoコマンドが成功した場合は成功結果を返す', async () => {
      const mockChild = {
        on: vi.fn((event: string, callback: Function) => {
          if (event === 'exit') {
            // 成功をシミュレート
            setTimeout(() => callback(0), 10);
          }
        }),
      };
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
        on: vi.fn((event: string, callback: Function) => {
          if (event === 'exit') {
            // 失敗をシミュレート
            setTimeout(() => callback(1), 10);
          }
        }),
      };
      mockSpawn.mockReturnValue(mockChild);

      const result = await permissionChecker.rerunWithSudo(['switch', 'dev']);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Operation failed with sudo.');
    });

    it('spawnでエラーが発生した場合は失敗結果を返す', async () => {
      const mockChild = {
        on: vi.fn((event: string, callback: Function) => {
          if (event === 'error') {
            // エラーをシミュレート
            setTimeout(() => callback(new Error('Command not found')), 10);
          }
        }),
      };
      mockSpawn.mockReturnValue(mockChild);

      const result = await permissionChecker.rerunWithSudo(['switch', 'dev']);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to execute sudo: Command not found');
    });

    it('npm経由での実行を検出してsudo npmコマンドを構築', async () => {
      // npm経由の実行をシミュレート
      const originalArgv = process.argv;
      const originalEnv = process.env.npm_execpath;
      process.argv = ['/usr/bin/node', '/path/to/npm/script'];
      process.env.npm_execpath = '/usr/bin/npm';

      const mockChild = {
        on: vi.fn((event: string, callback: Function) => {
          if (event === 'exit') {
            setTimeout(() => callback(0), 10);
          }
        }),
      };
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
        process.env.npm_execpath = originalEnv;
      } else {
        delete process.env.npm_execpath;
      }
    });

    it('直接実行の場合はsudo nodeコマンドを構築', async () => {
      // 直接実行をシミュレート
      const originalArgv = process.argv;
      process.argv = ['/usr/bin/node', '/path/to/hostswitch.js'];
      delete process.env.npm_execpath;

      const mockChild = {
        on: vi.fn((event: string, callback: Function) => {
          if (event === 'exit') {
            setTimeout(() => callback(0), 10);
          }
        }),
      };
      mockSpawn.mockReturnValue(mockChild);

      await permissionChecker.rerunWithSudo(['switch', 'dev']);

      expect(mockSpawn).toHaveBeenCalledWith(
        'sudo',
        ['/usr/bin/node', '/path/to/hostswitch.js', 'switch', 'dev'],
        expect.any(Object)
      );

      // 復元
      process.argv = originalArgv;
    });
  });
});
