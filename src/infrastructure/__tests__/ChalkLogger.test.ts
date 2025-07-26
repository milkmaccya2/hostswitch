import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChalkLogger } from '../ChalkLogger';

describe('ChalkLogger', () => {
  let logger: ChalkLogger;
  let consoleSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    logger = new ChalkLogger();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('info()', () => {
    it('メッセージをそのまま出力', () => {
      const message = 'Information message';

      logger.info(message);

      expect(consoleSpy).toHaveBeenCalledWith(message);
    });
  });

  describe('warn()', () => {
    it('警告メッセージを黄色で出力', () => {
      const message = 'Warning message';

      logger.warn(message);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(message));
    });
  });

  describe('error()', () => {
    it('エラーメッセージを赤色でconsole.errorに出力', () => {
      const message = 'Error message';

      logger.error(message);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error: ' + message));
    });
  });

  describe('success()', () => {
    it('成功メッセージを緑色で出力', () => {
      const message = 'Success message';

      logger.success(message);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(message));
    });
  });

  describe('dim()', () => {
    it('薄い色でメッセージを出力', () => {
      const message = 'Dim message';

      logger.dim(message);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(message));
    });
  });

  describe('bold()', () => {
    it('太字でメッセージを出力', () => {
      const message = 'Bold message';

      logger.bold(message);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(message));
    });
  });

  describe('複数メソッドの呼び出し', () => {
    it('異なるメソッドを連続で呼び出せる', () => {
      logger.info('Info');
      logger.warn('Warning');
      logger.error('Error');

      expect(consoleSpy).toHaveBeenCalledTimes(2); // info, warn
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1); // error
    });
  });
});
