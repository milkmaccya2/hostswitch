import { spawnSync } from 'node:child_process';
import type { CommandRunner, DnsFlushResult, IDnsCacheFlusher } from '../interfaces';

interface FlushCommand {
  command: string;
  args: string[];
}

/**
 * hostsファイルを書き換えても、OSのDNSキャッシュが残っていると名前解決は
 * 切り替わらない。switch は既にsudoを取得しているので、同じ昇格の中で
 * フラッシュまで済ませる。
 *
 * フラッシュはベストエフォート。コマンドが無い環境（キャッシュデーモンを
 * 持たないLinuxなど）では何もせず成功として扱い、切り替え自体は妨げない。
 */
export class DnsCacheFlusher implements IDnsCacheFlusher {
  constructor(
    private runner: CommandRunner = defaultRunner,
    private platform: string = process.platform
  ) {}

  async flush(): Promise<DnsFlushResult> {
    const strategies = this.getStrategies();

    if (strategies.length === 0) {
      return { attempted: false, success: true };
    }

    for (const strategy of strategies) {
      if (!this.isAvailable(strategy[0])) {
        continue;
      }

      const executed: string[] = [];
      for (const step of strategy) {
        const result = this.runner(step.command, step.args);
        const label = [step.command, ...step.args].join(' ');

        if (result.error || result.status !== 0) {
          return {
            attempted: true,
            success: false,
            command: label,
            message: result.error?.message ?? `exited with code ${result.status}`,
          };
        }
        executed.push(label);
      }

      return { attempted: true, success: true, command: executed.join(' && ') };
    }

    // 該当するコマンドが1つも無い環境。キャッシュデーモンが無いだけの
    // ことも多いので、失敗ではなく「試していない」として扱う
    return { attempted: false, success: true };
  }

  /**
   * 実際に起動してみて ENOENT かどうかで判定する。`which` に頼ると
   * プラットフォームごとに別のコマンドが必要になるため。
   */
  private isAvailable(step: FlushCommand): boolean {
    const probe = this.runner(step.command, step.args);
    return (probe.error as NodeJS.ErrnoException | undefined)?.code !== 'ENOENT';
  }

  /**
   * 1つの配列が「まとめて実行する一連のコマンド」、配列の配列が
   * 「上から順に試す代替手段」を表す。
   */
  private getStrategies(): FlushCommand[][] {
    switch (this.platform) {
      case 'darwin':
        return [
          [
            { command: 'dscacheutil', args: ['-flushcache'] },
            { command: 'killall', args: ['-HUP', 'mDNSResponder'] },
          ],
        ];
      case 'win32':
        return [[{ command: 'ipconfig', args: ['/flushdns'] }]];
      case 'linux':
        // ディストリ差が大きい。使えるものを上から順に1つだけ使う
        return [
          [{ command: 'resolvectl', args: ['flush-caches'] }],
          [{ command: 'systemd-resolve', args: ['--flush-caches'] }],
          [{ command: 'nscd', args: ['-i', 'hosts'] }],
        ];
      default:
        return [];
    }
  }
}

const defaultRunner: CommandRunner = (command, args) => {
  // シェルを経由しないよう引数配列で渡す
  const result = spawnSync(command, args, { stdio: 'ignore' });
  return { status: result.status, error: result.error };
};
