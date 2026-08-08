import { describe, expect, it, vi } from 'vitest';
import type { UpdateCheckerDeps } from '../UpdateChecker';
import { UpdateChecker } from '../UpdateChecker';

const pkg = { name: 'hostswitch', version: '1.2.13' };

/** update-notifier の呼び出しを記録するだけのスタブ */
function createChecker(opts: { env?: NodeJS.ProcessEnv; euid?: number | undefined } = {}) {
  const notify = vi.fn();
  const notifier = vi.fn(() => ({ notify }));
  const checker = new UpdateChecker(pkg, {
    env: opts.env ?? {},
    getEuid: () => opts.euid,
    notifier: notifier as unknown as UpdateCheckerDeps['notifier'],
  });
  return { checker, notifier, notify };
}

describe('UpdateChecker', () => {
  describe('skipReason()', () => {
    it('通常は null（チェックする）', () => {
      const { checker } = createChecker({ euid: 501 });
      expect(checker.skipReason()).toBeNull();
    });

    it('HOSTSWITCH_NO_UPDATE_CHECK=true なら見送る', () => {
      const { checker } = createChecker({
        env: { HOSTSWITCH_NO_UPDATE_CHECK: 'true' },
        euid: 501,
      });
      expect(checker.skipReason()).toBe('opted-out');
    });

    it('true 以外の値では見送らない', () => {
      const { checker } = createChecker({
        env: { HOSTSWITCH_NO_UPDATE_CHECK: '1' },
        euid: 501,
      });
      expect(checker.skipReason()).toBeNull();
    });

    it('root 実行中は見送る', () => {
      // sudo 実行時に configstore が root 所有で作られると、
      // 以降の非 sudo 実行が EACCES で落ちるため
      const { checker } = createChecker({ euid: 0 });
      expect(checker.skipReason()).toBe('running-as-root');
    });

    it('euid を取得できない環境（Windows）ではチェックする', () => {
      const { checker } = createChecker({ euid: undefined });
      expect(checker.skipReason()).toBeNull();
    });
  });

  describe('check()', () => {
    it('チェック時は24時間間隔を指定する', () => {
      const { checker, notifier, notify } = createChecker({ euid: 501 });

      const reason = checker.check('msg');

      expect(reason).toBeNull();
      expect(notifier).toHaveBeenCalledWith(
        expect.objectContaining({ pkg, updateCheckInterval: 1000 * 60 * 60 * 24 })
      );
      expect(notify).toHaveBeenCalledWith(expect.objectContaining({ message: 'msg' }));
    });

    it('毎回チェックする設定（interval 0）にはしない', () => {
      const { checker, notifier } = createChecker({ euid: 501 });

      checker.check('msg');

      const arg = notifier.mock.calls[0][0] as { updateCheckInterval: number };
      expect(arg.updateCheckInterval).toBeGreaterThan(0);
    });

    it('オプトアウト時は update-notifier を呼ばない', () => {
      const { checker, notifier } = createChecker({
        env: { HOSTSWITCH_NO_UPDATE_CHECK: 'true' },
        euid: 501,
      });

      expect(checker.check('msg')).toBe('opted-out');
      expect(notifier).not.toHaveBeenCalled();
    });

    it('root 実行時は update-notifier を呼ばない', () => {
      const { checker, notifier } = createChecker({ euid: 0 });

      expect(checker.check('msg')).toBe('running-as-root');
      expect(notifier).not.toHaveBeenCalled();
    });
  });
});
