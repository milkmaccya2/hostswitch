import { afterEach, describe, expect, it } from 'vitest';
import { createConfig } from '../index';

describe('createConfig', () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    // process.platformを元に戻す
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true,
    });
  });

  describe('Unix/Linux/macOSプラットフォーム', () => {
    it('darwinプラットフォームで正しいhostsパスを設定', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
      });

      const config = createConfig();

      expect(config.hostsPath).toBe('/etc/hosts');
      expect(config.configDir).toContain('.hostswitch');
      expect(config.profilesDir).toContain('profiles');
      expect(config.backupDir).toContain('backups');
      expect(config.currentProfileFile).toContain('current.json');
    });

    it('Linuxプラットフォームでも同じパスを使用', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true,
      });

      const config = createConfig();

      expect(config.hostsPath).toBe('/etc/hosts');
    });
  });

  describe('Windowsプラットフォーム', () => {
    it('Windowsの正しいhostsパスを設定', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
      });

      const config = createConfig();

      expect(config.hostsPath).toBe('C:\\Windows\\System32\\drivers\\etc\\hosts');
    });
  });

  describe('設定ディレクトリ構造', () => {
    it('設定構造の一貫性を確認', () => {
      const config = createConfig();

      expect(config.configDir).toBeDefined();
      expect(config.profilesDir).toBeDefined();
      expect(config.backupDir).toBeDefined();
      expect(config.currentProfileFile).toBeDefined();
      expect(config.hostsPath).toBeDefined();
    });

    it('各パスが適切な文字列を含む', () => {
      const config = createConfig();

      expect(config.configDir).toContain('.hostswitch');
      expect(config.profilesDir).toContain('profiles');
      expect(config.backupDir).toContain('backups');
      expect(config.currentProfileFile).toContain('current.json');
    });
  });

  describe('プラットフォーム固有の動作', () => {
    it('未知のプラットフォームではUnix形式のパスを使用', () => {
      Object.defineProperty(process, 'platform', {
        value: 'unknown' as NodeJS.Platform,
        writable: true,
      });

      const config = createConfig();

      expect(config.hostsPath).toBe('/etc/hosts');
    });

    it('複数回呼び出しても一貫した結果を返す', () => {
      const config1 = createConfig();
      const config2 = createConfig();

      expect(config1).toEqual(config2);
    });
  });
});
