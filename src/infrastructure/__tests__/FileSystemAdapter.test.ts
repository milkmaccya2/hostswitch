import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FileSystemAdapter } from '../FileSystemAdapter';

vi.mock('fs-extra', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  copySync: vi.fn(),
  unlinkSync: vi.fn(),
  existsSync: vi.fn(),
  ensureDirSync: vi.fn(),
  readdirSync: vi.fn(),
  readJsonSync: vi.fn(),
  writeJsonSync: vi.fn(),
}));

describe('FileSystemAdapter', () => {
  let adapter: FileSystemAdapter;
  let mockFs: any;

  beforeEach(async () => {
    adapter = new FileSystemAdapter();
    mockFs = await vi.importMock('fs-extra');
    vi.clearAllMocks();
  });

  describe('async methods', () => {
    describe('readFile()', () => {
      it('ファイルを非同期で読み取り', async () => {
        const testContent = 'test file content';
        mockFs.readFile.mockResolvedValue(testContent);

        const result = await adapter.readFile('/test/path');

        expect(mockFs.readFile).toHaveBeenCalledWith('/test/path', 'utf8');
        expect(result).toBe(testContent);
      });

      it('ファイル読み取りエラーを適切に伝播', async () => {
        const error = new Error('File not found');
        mockFs.readFile.mockRejectedValue(error);

        await expect(adapter.readFile('/nonexistent')).rejects.toThrow('File not found');
      });
    });

    describe('writeFile()', () => {
      it('ファイルを非同期で書き込み', async () => {
        mockFs.writeFile.mockResolvedValue(undefined);

        await adapter.writeFile('/test/path', 'content');

        expect(mockFs.writeFile).toHaveBeenCalledWith('/test/path', 'content', 'utf8');
      });

      it('ファイル書き込みエラーを適切に伝播', async () => {
        const error = new Error('Write failed');
        mockFs.writeFile.mockRejectedValue(error);

        await expect(adapter.writeFile('/test/path', 'content')).rejects.toThrow('Write failed');
      });
    });
  });

  describe('sync methods', () => {
    describe('readFileSync()', () => {
      it('ファイルを同期で読み取り', () => {
        const testContent = 'sync content';
        mockFs.readFileSync.mockReturnValue(testContent);

        const result = adapter.readFileSync('/test/path');

        expect(mockFs.readFileSync).toHaveBeenCalledWith('/test/path', 'utf8');
        expect(result).toBe(testContent);
      });
    });

    describe('writeFileSync()', () => {
      it('ファイルを同期で書き込み', () => {
        adapter.writeFileSync('/test/path', 'sync content');

        expect(mockFs.writeFileSync).toHaveBeenCalledWith('/test/path', 'sync content', 'utf8');
      });
    });

    describe('copySync()', () => {
      it('ファイルをコピー', () => {
        adapter.copySync('/src/path', '/dest/path');

        expect(mockFs.copySync).toHaveBeenCalledWith('/src/path', '/dest/path');
      });
    });

    describe('unlinkSync()', () => {
      it('ファイルを削除', () => {
        adapter.unlinkSync('/test/path');

        expect(mockFs.unlinkSync).toHaveBeenCalledWith('/test/path');
      });
    });

    describe('existsSync()', () => {
      it('ファイル存在確認でtrueを返す', () => {
        mockFs.existsSync.mockReturnValue(true);

        const result = adapter.existsSync('/existing/path');

        expect(mockFs.existsSync).toHaveBeenCalledWith('/existing/path');
        expect(result).toBe(true);
      });

      it('ファイル存在確認でfalseを返す', () => {
        mockFs.existsSync.mockReturnValue(false);

        const result = adapter.existsSync('/nonexistent/path');

        expect(result).toBe(false);
      });
    });

    describe('ensureDirSync()', () => {
      it('ディレクトリを作成', () => {
        adapter.ensureDirSync('/test/dir');

        expect(mockFs.ensureDirSync).toHaveBeenCalledWith('/test/dir');
      });
    });

    describe('readdirSync()', () => {
      it('ディレクトリ内容を読み取り', () => {
        const files = ['file1.txt', 'file2.txt'];
        mockFs.readdirSync.mockReturnValue(files);

        const result = adapter.readdirSync('/test/dir');

        expect(mockFs.readdirSync).toHaveBeenCalledWith('/test/dir');
        expect(result).toEqual(files);
      });
    });

    describe('readJsonSync()', () => {
      it('JSONファイルを読み取り', () => {
        const testData = { key: 'value' };
        mockFs.readJsonSync.mockReturnValue(testData);

        const result = adapter.readJsonSync('/test/config.json');

        expect(mockFs.readJsonSync).toHaveBeenCalledWith('/test/config.json');
        expect(result).toEqual(testData);
      });
    });

    describe('writeJsonSync()', () => {
      it('JSONファイルを書き込み', () => {
        const testData = { key: 'value' };

        adapter.writeJsonSync('/test/config.json', testData);

        expect(mockFs.writeJsonSync).toHaveBeenCalledWith('/test/config.json', testData);
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('同期メソッドでエラーが発生した場合は例外を投げる', () => {
      const error = new Error('Sync operation failed');
      mockFs.readFileSync.mockImplementation(() => {
        throw error;
      });

      expect(() => adapter.readFileSync('/error/path')).toThrow('Sync operation failed');
    });
  });
});
