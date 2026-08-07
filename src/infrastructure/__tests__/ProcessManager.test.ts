import { spawnSync } from 'node:child_process';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcessManager } from '../ProcessManager';

vi.mock('node:child_process');

const ok = { status: 0, error: undefined } as unknown as ReturnType<typeof spawnSync>;

describe('ProcessManager', () => {
  let manager: ProcessManager;
  const mockSpawnSync = vi.mocked(spawnSync);

  beforeEach(() => {
    manager = new ProcessManager();
    vi.clearAllMocks();
  });

  describe('executeEditor()', () => {
    it('コマンドと引数を分けて渡す（シェルを経由しない）', async () => {
      mockSpawnSync.mockReturnValue(ok);

      await manager.executeEditor('vi', '/test/file.txt');

      expect(mockSpawnSync).toHaveBeenCalledWith('vi', ['/test/file.txt'], { stdio: 'inherit' });
    });

    it('引数つきのエディタ指定を分解する', async () => {
      mockSpawnSync.mockReturnValue(ok);

      await manager.executeEditor('code --wait', '/test/file.txt');

      expect(mockSpawnSync).toHaveBeenCalledWith('code', ['--wait', '/test/file.txt'], {
        stdio: 'inherit',
      });
    });

    it('パスにスペースが含まれていても1つの引数として渡る', async () => {
      mockSpawnSync.mockReturnValue(ok);

      await manager.executeEditor('vi', '/test/my profile.hosts');

      expect(mockSpawnSync).toHaveBeenCalledWith('vi', ['/test/my profile.hosts'], {
        stdio: 'inherit',
      });
    });

    it('シェルのメタ文字を含むパスでも展開されない', async () => {
      mockSpawnSync.mockReturnValue(ok);

      await manager.executeEditor('vi', '/test/$(whoami).hosts');

      expect(mockSpawnSync).toHaveBeenCalledWith('vi', ['/test/$(whoami).hosts'], {
        stdio: 'inherit',
      });
    });

    it('起動に失敗した場合は例外を投げる', async () => {
      const error = new Error('spawn nonexistent ENOENT');
      mockSpawnSync.mockReturnValue({ status: null, error } as unknown as ReturnType<
        typeof spawnSync
      >);

      await expect(manager.executeEditor('nonexistent', '/test/file.txt')).rejects.toThrow(
        'spawn nonexistent ENOENT'
      );
    });

    it('エディタが非ゼロ終了した場合は例外を投げる', async () => {
      mockSpawnSync.mockReturnValue({ status: 1, error: undefined } as unknown as ReturnType<
        typeof spawnSync
      >);

      await expect(manager.executeEditor('editor', '/file')).rejects.toThrow('exited with code 1');
    });

    it('エディタ名が空なら例外を投げる', async () => {
      await expect(manager.executeEditor('   ', '/file')).rejects.toThrow('No editor specified');
    });

    it('成功時は undefined を返す', async () => {
      mockSpawnSync.mockReturnValue(ok);

      await expect(manager.executeEditor('vi', '/test/file.txt')).resolves.toBeUndefined();
    });
  });

  describe('openEditor()', () => {
    it('executeEditor に委譲する', async () => {
      mockSpawnSync.mockReturnValue(ok);

      await manager.openEditor('nano', '/test/file.txt');

      expect(mockSpawnSync).toHaveBeenCalledWith('nano', ['/test/file.txt'], { stdio: 'inherit' });
    });
  });
});
