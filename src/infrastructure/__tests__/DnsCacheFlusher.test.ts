import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommandRunner } from '../../interfaces';
import { DnsCacheFlusher } from '../DnsCacheFlusher';

/** ENOENT を返す = そのコマンドが存在しない環境 */
const notFound = () => ({
  status: null,
  error: Object.assign(new Error('spawn ENOENT'), { code: 'ENOENT' }),
});
const ok = () => ({ status: 0, error: undefined });

describe('DnsCacheFlusher', () => {
  let calls: Array<{ command: string; args: string[] }>;

  const recordingRunner =
    (behavior: (command: string) => ReturnType<CommandRunner>): CommandRunner =>
    (command, args) => {
      calls.push({ command, args });
      return behavior(command);
    };

  beforeEach(() => {
    calls = [];
  });

  describe('macOS', () => {
    it('dscacheutil と mDNSResponder の両方を実行する', async () => {
      const flusher = new DnsCacheFlusher(recordingRunner(ok), 'darwin');

      const result = await flusher.flush();

      expect(result).toMatchObject({ attempted: true, success: true });
      // 1回目は存在確認、その後に本実行が入る
      const executed = calls.map((c) => [c.command, ...c.args].join(' '));
      expect(executed).toContain('dscacheutil -flushcache');
      expect(executed).toContain('killall -HUP mDNSResponder');
    });

    it('片方が失敗したら失敗として返す', async () => {
      const flusher = new DnsCacheFlusher(
        recordingRunner((command) =>
          command === 'killall' ? { status: 1, error: undefined } : ok()
        ),
        'darwin'
      );

      const result = await flusher.flush();

      expect(result.success).toBe(false);
      expect(result.command).toBe('killall -HUP mDNSResponder');
    });
  });

  describe('Windows', () => {
    it('ipconfig /flushdns を実行する', async () => {
      const flusher = new DnsCacheFlusher(recordingRunner(ok), 'win32');

      const result = await flusher.flush();

      expect(result).toMatchObject({ attempted: true, success: true });
      expect(calls.some((c) => c.command === 'ipconfig' && c.args[0] === '/flushdns')).toBe(true);
    });
  });

  describe('Linux', () => {
    it('利用できる最初の手段を1つだけ使う', async () => {
      const flusher = new DnsCacheFlusher(recordingRunner(ok), 'linux');

      const result = await flusher.flush();

      expect(result).toMatchObject({ attempted: true, success: true });
      expect(result.command).toBe('resolvectl flush-caches');
      // resolvectl が使えるなら他は試さない
      expect(calls.some((c) => c.command === 'systemd-resolve')).toBe(false);
      expect(calls.some((c) => c.command === 'nscd')).toBe(false);
    });

    it('resolvectl が無ければ次の手段にフォールバックする', async () => {
      const flusher = new DnsCacheFlusher(
        recordingRunner((command) => (command === 'resolvectl' ? notFound() : ok())),
        'linux'
      );

      const result = await flusher.flush();

      expect(result.success).toBe(true);
      expect(result.command).toBe('systemd-resolve --flush-caches');
    });

    it('どのコマンドも無い環境では attempted=false で成功扱いにする', async () => {
      // キャッシュデーモンを持たないLinuxは珍しくない。失敗にしてはいけない
      const flusher = new DnsCacheFlusher(recordingRunner(notFound), 'linux');

      const result = await flusher.flush();

      expect(result).toEqual({ attempted: false, success: true });
    });
  });

  describe('未知のプラットフォーム', () => {
    it('何も実行せず成功扱いにする', async () => {
      const runner = vi.fn();
      const flusher = new DnsCacheFlusher(runner as unknown as CommandRunner, 'freebsd');

      const result = await flusher.flush();

      expect(result).toEqual({ attempted: false, success: true });
      expect(runner).not.toHaveBeenCalled();
    });
  });

  it('シェルを経由しないよう引数は配列で渡す', async () => {
    const flusher = new DnsCacheFlusher(recordingRunner(ok), 'darwin');

    await flusher.flush();

    for (const call of calls) {
      expect(Array.isArray(call.args)).toBe(true);
      expect(call.command).not.toContain(' ');
    }
  });
});
