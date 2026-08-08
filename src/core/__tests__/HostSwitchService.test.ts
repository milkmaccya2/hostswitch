import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DnsFlushResult } from '../../interfaces';
import { HostSwitchService } from '../HostSwitchService';
import { createTestMocks, createTestProfiles, setCurrentProfile } from './setup';

describe('HostSwitchService - 統合テスト', () => {
  let service: HostSwitchService;
  let mocks: ReturnType<typeof createTestMocks>;

  beforeEach(() => {
    mocks = createTestMocks();
    service = new HostSwitchService(
      mocks.mockFileSystem,
      mocks.mockLogger,
      mocks.config,
      mocks.mockPermissionChecker
    );
  });

  describe('マネージャクラスとの統合', () => {
    it('getProfiles()は現在のプロファイル情報と合わせて取得', () => {
      createTestProfiles(mocks.mockFileSystem, mocks.config);
      setCurrentProfile(mocks.mockFileSystem, mocks.config, 'dev');

      const result = service.getProfiles();

      expect(result).toHaveLength(3);
      const devProfile = result.find((p) => p.name === 'dev');
      expect(devProfile?.isCurrent).toBe(true);
    });

    it('createProfile()とprofileExists()の統合', () => {
      const createResult = service.createProfile('test');
      expect(createResult.success).toBe(true);

      const exists = service.profileExists('test');
      expect(exists).toBe(true);
    });

    it('削除されたプロファイルはgetProfiles()に現れない', () => {
      service.createProfile('temp');
      expect(service.getProfiles()).toHaveLength(1);

      service.deleteProfile('temp');
      expect(service.getProfiles()).toHaveLength(0);
    });
  });

  describe('switchProfile() - 複雑なシナリオ', () => {
    it('完全なワークフロー: 作成→切り替え→状態確認', async () => {
      // プロファイル作成
      const createResult = service.createProfile('workflow-test');
      expect(createResult.success).toBe(true);

      // プロファイル切り替え
      const switchResult = await service.switchProfile('workflow-test');
      expect(switchResult.success).toBe(true);

      // 現在のプロファイル確認
      const currentProfile = service.getCurrentProfile();
      expect(currentProfile).toBe('workflow-test');

      // プロファイル一覧での確認
      const profiles = service.getProfiles();
      const activeProfile = profiles.find((p) => p.name === 'workflow-test');
      expect(activeProfile?.isCurrent).toBe(true);
    });

    it('存在しないプロファイルへの切り替えでエラー', async () => {
      const result = await service.switchProfile('nonexistent-profile');

      expect(result.success).toBe(false);
      expect(result.message).toContain('does not exist');
    });

    it('hosts変更検出時の警告ログとバックアップ作成', async () => {
      createTestProfiles(mocks.mockFileSystem, mocks.config);
      setCurrentProfile(mocks.mockFileSystem, mocks.config, 'dev', 'old-checksum');
      mocks.mockFileSystem.setFile(mocks.config.hostsPath, 'modified hosts content');

      const result = await service.switchProfile('staging');

      expect(result.success).toBe(true);
      expect(result.backupPath).toBeDefined();
      expect(mocks.mockLogger.hasMessage('modified outside', 'warn')).toBe(true);
    });

    it('プロファイル削除とアクティブプロファイル保護', async () => {
      service.createProfile('active-profile');
      await service.switchProfile('active-profile');

      // アクティブなプロファイルは削除できない
      const deleteResult = service.deleteProfile('active-profile');
      expect(deleteResult.success).toBe(false);
      expect(deleteResult.message).toContain('currently active');

      // 別のプロファイルに切り替え後は削除可能
      service.createProfile('another-profile');
      await service.switchProfile('another-profile');

      const deleteResult2 = service.deleteProfile('active-profile');
      expect(deleteResult2.success).toBe(true);
    });
  });

  describe('その他のメソッド', () => {
    it('getProfileContent()でプロファイル内容を取得', () => {
      const testContent = 'test profile content';
      mocks.mockFileSystem.setFile(`${mocks.config.profilesDir}/test.hosts`, testContent);

      const result = service.getProfileContent('test');

      expect(result.success).toBe(true);
      expect(result.content).toBe(testContent);
    });

    it('getProfilePath()で正しいパスを返す', () => {
      const result = service.getProfilePath('test');

      expect(result).toBe(`${mocks.config.profilesDir}/test.hosts`);
    });
  });

  describe('エラーハンドリング - 統合シナリオ', () => {
    it('switchProfile()でEACCESエラー時の適切な処理', async () => {
      mocks.mockFileSystem.setFile(`${mocks.config.profilesDir}/dev.hosts`, 'content');
      mocks.mockFileSystem.setFile(mocks.config.hostsPath, 'original');

      // 2回目のcopySync（プロファイル適用時）で権限エラー
      let copySyncCallCount = 0;
      const originalCopySync = mocks.mockFileSystem.copySync;
      mocks.mockFileSystem.copySync = (src: string, dest: string) => {
        copySyncCallCount++;
        if (copySyncCallCount === 2) {
          const error = new Error('Permission denied') as NodeJS.ErrnoException;
          error.code = 'EACCES';
          throw error;
        }
        return originalCopySync.call(mocks.mockFileSystem, src, dest);
      };

      const result = await service.switchProfile('dev');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Permission denied');
      expect(result.message).toContain('sudo');

      mocks.mockFileSystem.copySync = originalCopySync;
    });

    it('switchProfile()でその他のエラー時の適切な処理', async () => {
      mocks.mockFileSystem.setFile(`${mocks.config.profilesDir}/dev.hosts`, 'content');
      mocks.mockFileSystem.setFile(mocks.config.hostsPath, 'original');

      // 2回目のcopySync（プロファイル適用時）でその他のエラー
      let copySyncCallCount = 0;
      const originalCopySync = mocks.mockFileSystem.copySync;
      mocks.mockFileSystem.copySync = (src: string, dest: string) => {
        copySyncCallCount++;
        if (copySyncCallCount === 2) {
          throw new Error('Disk full');
        }
        return originalCopySync.call(mocks.mockFileSystem, src, dest);
      };

      const result = await service.switchProfile('dev');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error switching profile');
      expect(result.message).toContain('Disk full');

      mocks.mockFileSystem.copySync = originalCopySync;
    });

    it('バックアップに失敗した場合は切り替えを中断しhostsを書き換えない', async () => {
      mocks.mockFileSystem.setFile(`${mocks.config.profilesDir}/dev.hosts`, 'dev content');
      mocks.mockFileSystem.setFile(mocks.config.hostsPath, 'original content');

      // バックアップのcopySync呼び出しで例外を投げる
      let copySyncCallCount = 0;
      const originalCopySync = mocks.mockFileSystem.copySync;
      mocks.mockFileSystem.copySync = (src: string, dest: string) => {
        copySyncCallCount++;
        if (copySyncCallCount === 1 && src === mocks.config.hostsPath) {
          throw new Error('Backup failed');
        }
        return originalCopySync.call(mocks.mockFileSystem, src, dest);
      };

      const result = await service.switchProfile('dev');

      // 退避できないまま hosts を触らない
      expect(result.success).toBe(false);
      expect(result.message).toContain('could not back up');
      expect(mocks.mockFileSystem.getFile(mocks.config.hostsPath)).toBe('original content');
      expect(service.getCurrentProfile()).toBeNull();

      mocks.mockFileSystem.copySync = originalCopySync;
    });

    it('切り替え中に失敗してもhostsが中途半端な内容にならない', async () => {
      mocks.mockFileSystem.setFile(`${mocks.config.profilesDir}/dev.hosts`, 'dev content');
      mocks.mockFileSystem.setFile(mocks.config.hostsPath, 'original content');

      // 一時ファイルからhostsへの rename で失敗させる
      const originalRenameSync = mocks.mockFileSystem.renameSync;
      mocks.mockFileSystem.renameSync = () => {
        throw new Error('Rename failed');
      };

      const result = await service.switchProfile('dev');

      expect(result.success).toBe(false);
      expect(mocks.mockFileSystem.getFile(mocks.config.hostsPath)).toBe('original content');

      // 一時ファイルを残さない
      const leftovers = mocks.mockFileSystem
        .getCalls('unlinkSync')
        .map((call) => call.args[0] as string);
      expect(leftovers.some((p) => p.includes('.hostswitch-'))).toBe(true);

      mocks.mockFileSystem.renameSync = originalRenameSync;
    });
  });

  describe('DNSキャッシュのフラッシュ', () => {
    const makeFlusher = (result: DnsFlushResult | Error) => ({
      flush: vi.fn(async () => {
        if (result instanceof Error) throw result;
        return result;
      }),
    });

    const serviceWith = (flusher: { flush: ReturnType<typeof vi.fn> }) =>
      new HostSwitchService(
        mocks.mockFileSystem,
        mocks.mockLogger,
        mocks.config,
        mocks.mockPermissionChecker,
        flusher
      );

    it('切り替え成功後にフラッシュを実行する', async () => {
      const flusher = makeFlusher({ attempted: true, success: true, command: 'dscacheutil' });
      const svc = serviceWith(flusher);
      svc.createProfile('dev');

      const result = await svc.switchProfile('dev');

      expect(result.success).toBe(true);
      expect(flusher.flush).toHaveBeenCalledOnce();
      expect(result.dnsFlush).toMatchObject({ attempted: true, success: true });
    });

    it('フラッシュが失敗しても切り替えは成功扱いにし、警告を出す', async () => {
      const flusher = makeFlusher({
        attempted: true,
        success: false,
        command: 'dscacheutil -flushcache',
        message: 'exited with code 1',
      });
      const svc = serviceWith(flusher);
      svc.createProfile('dev');

      const result = await svc.switchProfile('dev');

      expect(result.success).toBe(true);
      expect(svc.getCurrentProfile()).toBe('dev');
      expect(mocks.mockLogger.hasMessage('Could not flush the DNS cache', 'warn')).toBe(true);
    });

    it('フラッシュが例外を投げても切り替えは成功扱いにする', async () => {
      const flusher = makeFlusher(new Error('boom'));
      const svc = serviceWith(flusher);
      svc.createProfile('dev');

      const result = await svc.switchProfile('dev');

      expect(result.success).toBe(true);
      expect(result.dnsFlush).toMatchObject({ attempted: true, success: false });
      expect(mocks.mockLogger.hasMessage('Could not flush the DNS cache', 'warn')).toBe(true);
    });

    it('flushDns=false ならフラッシュを呼ばない', async () => {
      const flusher = makeFlusher({ attempted: true, success: true });
      const svc = serviceWith(flusher);
      svc.createProfile('dev');

      const result = await svc.switchProfile('dev', { flushDns: false });

      expect(result.success).toBe(true);
      expect(flusher.flush).not.toHaveBeenCalled();
      expect(result.dnsFlush).toBeUndefined();
    });

    it('フラッシャが注入されていなくても切り替えは成功する', async () => {
      // 既存の呼び出し側（4引数）を壊さないこと
      service.createProfile('dev');

      const result = await service.switchProfile('dev');

      expect(result.success).toBe(true);
      expect(result.dnsFlush).toBeUndefined();
    });
  });

  describe('sudo権限チェック', () => {
    it('sudoが必要な場合は自動的にsudo実行する', async () => {
      mocks.mockFileSystem.setFile(`${mocks.config.profilesDir}/dev.hosts`, 'dev content');
      mocks.mockPermissionChecker.requiresSudoResult = true;
      mocks.mockPermissionChecker.rerunWithSudoResult = {
        success: true,
        message: 'Successfully switched with sudo',
      };

      const result = await service.switchProfile('dev');

      // モックの呼び出し履歴を確認
      const requiresSudoCalls = mocks.mockPermissionChecker.calls.filter(
        (call) => call.method === 'requiresSudo'
      );
      const rerunWithSudoCalls = mocks.mockPermissionChecker.calls.filter(
        (call) => call.method === 'rerunWithSudo'
      );

      expect(requiresSudoCalls).toHaveLength(1);
      expect(requiresSudoCalls[0].args[0]).toBe(mocks.config.hostsPath);
      expect(rerunWithSudoCalls).toHaveLength(1);
      expect(rerunWithSudoCalls[0].args[0]).toEqual(['switch', 'dev']);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Successfully switched with sudo');
      expect(result.requiresSudo).toBe(true);
    });

    it('sudo実行が失敗した場合はエラーを返す', async () => {
      mocks.mockFileSystem.setFile(`${mocks.config.profilesDir}/dev.hosts`, 'dev content');
      mocks.mockPermissionChecker.requiresSudoResult = true;
      mocks.mockPermissionChecker.rerunWithSudoResult = {
        success: false,
        message: 'Sudo authentication failed',
      };

      const result = await service.switchProfile('dev');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Sudo authentication failed');
      expect(result.requiresSudo).toBe(true);
    });

    it('sudoが不要な場合は通常の処理を実行', async () => {
      mocks.mockFileSystem.setFile(`${mocks.config.profilesDir}/dev.hosts`, 'dev content');
      mocks.mockPermissionChecker.requiresSudoResult = false;

      const result = await service.switchProfile('dev');

      // モックの呼び出し履歴を確認
      const requiresSudoCalls = mocks.mockPermissionChecker.calls.filter(
        (call) => call.method === 'requiresSudo'
      );
      const rerunWithSudoCalls = mocks.mockPermissionChecker.calls.filter(
        (call) => call.method === 'rerunWithSudo'
      );

      expect(requiresSudoCalls).toHaveLength(1);
      expect(requiresSudoCalls[0].args[0]).toBe(mocks.config.hostsPath);
      expect(rerunWithSudoCalls).toHaveLength(0);
      expect(result.success).toBe(true);
      expect(result.requiresSudo).toBeUndefined();
    });
  });

  describe('isProfileApplied()', () => {
    it('プロファイルの内容がhostsと一致していればtrue', () => {
      mocks.mockFileSystem.setFile(`${mocks.config.profilesDir}/dev.hosts`, 'dev content');
      mocks.mockFileSystem.setFile(mocks.config.hostsPath, 'dev content');

      expect(service.isProfileApplied('dev')).toBe(true);
    });

    it('編集してhostsと差が出たらfalse', () => {
      mocks.mockFileSystem.setFile(`${mocks.config.profilesDir}/dev.hosts`, 'edited content');
      mocks.mockFileSystem.setFile(mocks.config.hostsPath, 'dev content');

      expect(service.isProfileApplied('dev')).toBe(false);
    });

    it('プロファイルが読めない場合は適用を促さない', () => {
      mocks.mockFileSystem.setFile(mocks.config.hostsPath, 'dev content');

      expect(service.isProfileApplied('missing')).toBe(true);
    });

    it('hostsが読めない場合は適用を促さない', () => {
      mocks.mockFileSystem.setFile(`${mocks.config.profilesDir}/dev.hosts`, 'dev content');

      expect(service.isProfileApplied('dev')).toBe(true);
    });
  });
});
