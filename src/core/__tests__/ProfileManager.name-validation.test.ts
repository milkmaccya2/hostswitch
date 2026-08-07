import { beforeEach, describe, expect, it } from 'vitest';
import { InvalidProfileNameError, ProfileManager } from '../ProfileManager';
import { createTestMocks } from './setup';

/**
 * プロファイル名はファイルパスの組み立てに使われるため、
 * プロファイルディレクトリの外へ出られないことを名前を受け取る全ての
 * 入口で確かめる。
 */
describe('ProfileManager - プロファイル名の検証', () => {
  let profileManager: ProfileManager;
  let mocks: ReturnType<typeof createTestMocks>;

  const traversalNames = [
    '../../../../tmp/evil',
    '../outside',
    'nested/name',
    'name/../../escape',
    '..',
    '.',
    'with space',
    'semi;colon',
    '$(whoami)',
    '',
  ];

  beforeEach(() => {
    mocks = createTestMocks();
    profileManager = new ProfileManager(mocks.mockFileSystem, mocks.config);
  });

  describe('isValidProfileName()', () => {
    it.each(traversalNames)('不正な名前 %j を拒否する', (name) => {
      expect(profileManager.isValidProfileName(name)).toBe(false);
    });

    it.each(['dev', 'staging-1', 'my_profile', 'A1'])('正当な名前 %j を許可する', (name) => {
      expect(profileManager.isValidProfileName(name)).toBe(true);
    });
  });

  describe('getProfilePath()', () => {
    it.each(traversalNames)('不正な名前 %j では例外を投げる', (name) => {
      expect(() => profileManager.getProfilePath(name)).toThrow(InvalidProfileNameError);
    });

    it('正当な名前はプロファイルディレクトリ配下を指す', () => {
      const result = profileManager.getProfilePath('dev');
      expect(result).toBe(`${mocks.config.profilesDir}/dev.hosts`);
    });
  });

  describe('名前を受け取る各メソッド', () => {
    it.each(traversalNames)('profileExists(%j) は false を返す', (name) => {
      expect(profileManager.profileExists(name)).toBe(false);
    });

    it.each(traversalNames)('createProfile(%j) は失敗する', (name) => {
      const result = profileManager.createProfile(name);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid profile name');
    });

    it.each(traversalNames)('deleteProfile(%j) は失敗する', (name) => {
      const result = profileManager.deleteProfile(name, null);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid profile name');
    });

    it.each(traversalNames)('getProfileContent(%j) は失敗する', (name) => {
      const result = profileManager.getProfileContent(name);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid profile name');
    });
  });

  it('ディレクトリ外のファイルが存在していても読み出せない', () => {
    mocks.mockFileSystem.setFile('/tmp/evil.hosts', '127.0.0.1 attacker.example');

    const result = profileManager.getProfileContent('../../../../tmp/evil');

    expect(result.success).toBe(false);
    expect(result.content).toBeUndefined();
  });
});
