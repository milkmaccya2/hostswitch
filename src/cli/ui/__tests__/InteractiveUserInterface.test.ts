import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockLogger } from '../../../__mocks__';
import type { ProfileInfo } from '../../../interfaces';
import type { HostSwitchFacade } from '../../HostSwitchFacade';
import { InteractiveUserInterface } from '../InteractiveUserInterface';

const promptMock = vi.fn();

vi.mock('inquirer', () => ({
  default: {
    prompt: (...args: unknown[]) => promptMock(...args),
  },
}));

/**
 * promptSelect が受け取った choices を覗くためのヘルパー。
 * inquirer に渡された question の choices をそのまま返す。
 */
function capturedChoices(callIndex: number): Array<{ name: string; value: string }> {
  const questions = promptMock.mock.calls[callIndex][0] as Array<{
    choices?: Array<{ name: string; value: string }>;
  }>;
  return questions[0].choices ?? [];
}

function createFacade(profiles: ProfileInfo[]) {
  return {
    listProfiles: vi.fn().mockResolvedValue({ success: true, data: { profiles } }),
    switchProfile: vi.fn().mockResolvedValue({ success: true, message: 'switched' }),
    getCurrentProfile: vi.fn().mockReturnValue(null),
  } as unknown as HostSwitchFacade;
}

describe('InteractiveUserInterface', () => {
  let logger: MockLogger;

  beforeEach(() => {
    promptMock.mockReset();
    logger = new MockLogger();
  });

  describe('プロファイル一覧の表示', () => {
    it('現在有効なプロファイルに (current) が付く', async () => {
      const facade = createFacade([
        { name: 'dev', isCurrent: true },
        { name: 'stg', isCurrent: false },
      ]);
      const ui = new InteractiveUserInterface(facade, logger);

      // showMainMenu -> 'list' を選ぶと handleListProfiles が動く
      promptMock.mockResolvedValueOnce({ selected: 'list' });
      promptMock.mockResolvedValueOnce({ selected: 'exit' });

      await ui.run();

      expect(logger.hasMessage('dev (current)')).toBe(true);
      expect(logger.hasMessage('stg (current)')).toBe(false);
    });

    it('プロファイルが0件なら作成を促す', async () => {
      const facade = createFacade([]);
      const ui = new InteractiveUserInterface(facade, logger);

      promptMock.mockResolvedValueOnce({ selected: 'list' });
      promptMock.mockResolvedValueOnce({ selected: 'exit' });

      await ui.run();

      expect(logger.hasMessage('No profiles found')).toBe(true);
    });
  });

  describe('切り替え先の選択', () => {
    it('現在有効なプロファイルは候補から除外される', async () => {
      const facade = createFacade([
        { name: 'dev', isCurrent: true },
        { name: 'stg', isCurrent: false },
        { name: 'prod', isCurrent: false },
      ]);
      const ui = new InteractiveUserInterface(facade, logger);

      promptMock.mockResolvedValueOnce({ selected: 'switch' });
      promptMock.mockResolvedValueOnce({ selected: 'stg' });

      await ui.run();

      // 0回目がメインメニュー、1回目が切り替え先の選択
      const names = capturedChoices(1).map((c) => c.value);
      expect(names).toEqual(['stg', 'prod']);
      expect(names).not.toContain('dev');
      expect(facade.switchProfile).toHaveBeenCalledWith('stg');
    });

    it('有効なプロファイル以外が無い場合は切り替えない', async () => {
      const facade = createFacade([{ name: 'dev', isCurrent: true }]);
      const ui = new InteractiveUserInterface(facade, logger);

      promptMock.mockResolvedValueOnce({ selected: 'switch' });

      await ui.run();

      expect(logger.hasMessage('No other profiles available')).toBe(true);
      expect(facade.switchProfile).not.toHaveBeenCalled();
    });
  });
});
