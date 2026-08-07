import { describe, expect, it } from 'vitest';
import { resolveEditor } from '../HostSwitchFacade';

describe('resolveEditor()', () => {
  it('EDITOR が設定されていればそれを使う', () => {
    expect(resolveEditor({ EDITOR: 'nano' })).toBe('nano');
  });

  it('VISUAL は EDITOR より優先される', () => {
    expect(resolveEditor({ EDITOR: 'nano', VISUAL: 'code --wait' })).toBe('code --wait');
  });

  it('どちらも未設定なら vi にフォールバックする', () => {
    expect(resolveEditor({})).toBe('vi');
  });

  it('空文字や空白のみの指定は無視して vi にフォールバックする', () => {
    expect(resolveEditor({ EDITOR: '' })).toBe('vi');
    expect(resolveEditor({ EDITOR: '   ' })).toBe('vi');
  });
});
