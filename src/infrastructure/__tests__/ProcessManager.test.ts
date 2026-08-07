import { execSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcessManager } from '../ProcessManager';

vi.mock('child_process');

describe('ProcessManager', () => {
  let manager: ProcessManager;
  const mockExecSync = vi.mocked(execSync);

  beforeEach(() => {
    manager = new ProcessManager();
    vi.clearAllMocks();
  });

  describe('executeEditor()', () => {
    const originalPlatform = process.platform;

    const setPlatform = (value: string) => {
      Object.defineProperty(process, 'platform', { value, writable: true });
    };

    afterEach(() => {
      Object.defineProperty(process, 'platform', { value: originalPlatform, writable: true });
    });

    it('エディタを正常に実行', async () => {
      setPlatform('darwin');
      mockExecSync.mockReturnValue(Buffer.from(''));

      await manager.executeEditor('vi', '/test/file.txt');

      expect(mockExecSync).toHaveBeenCalledWith("vi '/test/file.txt'", { stdio: 'inherit' });
    });

    it('複数の引数を持つエディタコマンドを実行', async () => {
      setPlatform('darwin');
      mockExecSync.mockReturnValue(Buffer.from(''));

      await manager.executeEditor('code --wait', '/test/file.txt');

      expect(mockExecSync).toHaveBeenCalledWith("code --wait '/test/file.txt'", {
        stdio: 'inherit',
      });
    });

    it('空白を含むパスでも1つの引数として渡す', async () => {
      setPlatform('darwin');
      mockExecSync.mockReturnValue(Buffer.from(''));

      await manager.executeEditor('vi', '/Users/my name/.hostswitch/profiles/dev.hosts');

      expect(mockExecSync).toHaveBeenCalledWith(
        "vi '/Users/my name/.hostswitch/profiles/dev.hosts'",
        { stdio: 'inherit' }
      );
    });

    it('シングルクォートを含むパスをエスケープする', async () => {
      setPlatform('darwin');
      mockExecSync.mockReturnValue(Buffer.from(''));

      await manager.executeEditor('vi', "/Users/o'brien/dev.hosts");

      expect(mockExecSync).toHaveBeenCalledWith("vi '/Users/o'\\''brien/dev.hosts'", {
        stdio: 'inherit',
      });
    });

    it('シェルが展開する文字を含むパスをそのまま渡す', async () => {
      setPlatform('darwin');
      mockExecSync.mockReturnValue(Buffer.from(''));

      await manager.executeEditor('vi', '/Users/$USER/dev.hosts');

      expect(mockExecSync).toHaveBeenCalledWith("vi '/Users/$USER/dev.hosts'", {
        stdio: 'inherit',
      });
    });

    it('Windowsではダブルクォートで囲む', async () => {
      setPlatform('win32');
      mockExecSync.mockReturnValue(Buffer.from(''));

      await manager.executeEditor('notepad', 'C:\\Users\\my name\\dev.hosts');

      expect(mockExecSync).toHaveBeenCalledWith('notepad "C:\\Users\\my name\\dev.hosts"', {
        stdio: 'inherit',
      });
    });

    it('エディタ実行エラーを適切に処理', async () => {
      const error = new Error('Editor not found');
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      await expect(manager.executeEditor('nonexistent-editor', '/test/file.txt')).rejects.toThrow(
        'Editor not found'
      );
    });

    it('エディタが終了コード1で終了した場合も例外を投げる', async () => {
      const error = Object.assign(new Error('Command failed: editor'), { status: 1 });
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      await expect(manager.executeEditor('editor', '/test/file.txt')).rejects.toThrow(
        'Command failed: editor'
      );
    });

    it('Promise.resolveで成功を返す', async () => {
      mockExecSync.mockReturnValue(Buffer.from(''));

      const result = manager.executeEditor('vi', '/test/file.txt');

      await expect(result).resolves.toBeUndefined();
    });

    it('execSyncにstdio: inheritオプションを渡す', async () => {
      mockExecSync.mockReturnValue(Buffer.from(''));

      await manager.executeEditor('vim', '/path/to/file');

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ stdio: 'inherit' })
      );
    });
  });

  describe('エラーハンドリング', () => {
    it('例外が発生した場合はPromise.rejectで処理', async () => {
      const error = new Error('Execution failed');
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const promise = manager.executeEditor('editor', '/file');

      await expect(promise).rejects.toBe(error);
    });

    it('非同期で例外を適切に処理', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Async error');
      });

      try {
        await manager.executeEditor('editor', '/file');
        expect(true).toBe(false); // この行に到達してはいけない
      } catch (error) {
        expect((error as Error).message).toBe('Async error');
      }
    });
  });
});
