import updateNotifier from 'update-notifier';

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

/** 更新チェックを行わない理由。行う場合は null */
export type SkipReason = 'opted-out' | 'running-as-root' | null;

export interface UpdateCheckerDeps {
  env?: NodeJS.ProcessEnv;
  /** 実効ユーザID。取得できない環境（Windows）では undefined */
  getEuid?: () => number | undefined;
  notifier?: typeof updateNotifier;
}

export interface UpdateCheckerPackage {
  name: string;
  version: string;
}

export class UpdateChecker {
  private env: NodeJS.ProcessEnv;
  private getEuid: () => number | undefined;
  private notifier: typeof updateNotifier;

  constructor(
    private pkg: UpdateCheckerPackage,
    deps: UpdateCheckerDeps = {}
  ) {
    this.env = deps.env ?? process.env;
    this.getEuid = deps.getEuid ?? (() => process.geteuid?.() ?? process.getuid?.());
    this.notifier = deps.notifier ?? updateNotifier;
  }

  /**
   * チェックを見送る理由を返す。行う場合は null。
   *
   * root で実行中に見送るのは、update-notifier が configstore を
   * root 所有で作ってしまい、以降の非 sudo 実行が EACCES で
   * 失敗するようになるため。switch は sudo で再実行されるので
   * この経路は普通に踏まれる。
   */
  skipReason(): SkipReason {
    if (this.env.HOSTSWITCH_NO_UPDATE_CHECK === 'true') {
      return 'opted-out';
    }
    if (this.getEuid() === 0) {
      return 'running-as-root';
    }
    return null;
  }

  /**
   * 更新があれば通知する。ネットワークアクセスは update-notifier が
   * バックグラウンドで行うため、ここでは待たない。
   */
  check(message: string): SkipReason {
    const reason = this.skipReason();
    if (reason !== null) {
      return reason;
    }

    this.notifier({
      pkg: this.pkg,
      // 既定と同じ24時間。0 にすると毎回ネットワークアクセスが発生する
      updateCheckInterval: ONE_DAY_MS,
      shouldNotifyInNpmScript: true,
    }).notify({ isGlobal: true, message });

    return null;
  }
}
