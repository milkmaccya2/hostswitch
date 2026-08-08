#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import packageJson from '../package.json';
import { CliController } from './cli/CliController';
import { HostSwitchFacade } from './cli/HostSwitchFacade';
import { CliUserInterface } from './cli/ui/CliUserInterface';
import { InteractiveUserInterface } from './cli/ui/InteractiveUserInterface';
import { createConfig } from './config';
import { HostSwitchService } from './core/HostSwitchService';
import { UpdateChecker } from './core/UpdateChecker';
import { ChalkLogger } from './infrastructure/ChalkLogger';
import { DnsCacheFlusher } from './infrastructure/DnsCacheFlusher';
import { FileSystemAdapter } from './infrastructure/FileSystemAdapter';
import { PermissionChecker } from './infrastructure/PermissionChecker';
import { ProcessManager } from './infrastructure/ProcessManager';

// 依存性の組み立て
const config = createConfig();
const fileSystem = new FileSystemAdapter();
const logger = new ChalkLogger();
const processManager = new ProcessManager();
const permissionChecker = new PermissionChecker();
const dnsCacheFlusher = new DnsCacheFlusher();

// サービス層の初期化
const hostSwitchService = new HostSwitchService(fileSystem, logger, config, dnsCacheFlusher);

// Facade層の初期化
const facade = new HostSwitchFacade(hostSwitchService, processManager, permissionChecker);

// sudo 再実行の唯一の実装。CLI / インタラクティブの両方がこれを使う
const elevate = (args: string[]) => permissionChecker.rerunWithSudo(args);

// コマンドライン引数の解析
function parseCommands() {
  const program = new Command();

  program
    .name('hostswitch')
    .description('A CLI tool for switching hosts file profiles')
    .version(packageJson.version);

  // List profiles command
  program
    .command('list')
    .alias('ls')
    .description('List all profiles')
    .action(async () => {
      const ui = new CliUserInterface(logger, elevate);
      const controller = new CliController(facade, ui);
      await controller.executeCommand('list');
    });

  // Create profile command
  program
    .command('create')
    .argument('<name>', 'Profile name')
    .option('--from-current', 'Copy current hosts file content')
    .description('Create a new profile')
    .action(async (name: string, options: { fromCurrent?: boolean }) => {
      const ui = new CliUserInterface(logger, elevate);
      const controller = new CliController(facade, ui);
      await controller.executeCommand('create', {
        name,
        fromCurrent: options.fromCurrent || false,
      });
    });

  // Switch profile command
  program
    .command('switch')
    .alias('use')
    .argument('<name>', 'Profile name')
    .option('--no-flush', 'Skip flushing the OS DNS cache after switching')
    .description('Switch to a profile (requires sudo)')
    .action(async (name: string, options: { flush?: boolean }) => {
      const ui = new CliUserInterface(logger, elevate);
      const controller = new CliController(facade, ui);
      await controller.executeCommand('switch', {
        name,
        // commander の --no-flush は options.flush を false にする。
        // 環境変数でも無効化できるようにする
        flushDns: options.flush !== false && process.env.HOSTSWITCH_NO_DNS_FLUSH !== 'true',
      });
    });

  // Show profile command
  program
    .command('show')
    .alias('cat')
    .argument('<name>', 'Profile name')
    .description('Show profile contents')
    .action(async (name: string) => {
      const ui = new CliUserInterface(logger, elevate);
      const controller = new CliController(facade, ui);
      await controller.executeCommand('show', { name });
    });

  // Edit profile command
  program
    .command('edit')
    .argument('<name>', 'Profile name')
    .description('Edit a profile')
    .action(async (name: string) => {
      const ui = new CliUserInterface(logger, elevate);
      const controller = new CliController(facade, ui);
      await controller.executeCommand('edit', { name });
    });

  // Delete profile command
  program
    .command('delete')
    .alias('rm')
    .argument('<name>', 'Profile name')
    .option('--force', 'Skip confirmation')
    .description('Delete a profile')
    .action(async (name: string, options: { force?: boolean }) => {
      const ui = new CliUserInterface(logger, elevate);
      const controller = new CliController(facade, ui);
      await controller.executeCommand('delete', {
        name,
        force: options.force || false,
      });
    });

  // Backup list command
  program
    .command('backups')
    .alias('backup-list')
    .description('List available hosts backups')
    .action(async () => {
      const ui = new CliUserInterface(logger, elevate);
      const controller = new CliController(facade, ui);
      await controller.executeCommand('backup-list');
    });

  // Restore command
  program
    .command('restore')
    .argument('[id]', 'Backup id to restore (defaults to the most recent)')
    .description('Restore the hosts file from a backup (requires sudo)')
    .action(async (id: string | undefined) => {
      const ui = new CliUserInterface(logger, elevate);
      const controller = new CliController(facade, ui);
      await controller.executeCommand('restore', { backupId: id });
    });

  return program;
}

// アプリケーション起動
async function main() {
  // アップデートチェック。
  // 既定の文言は npm i -g を「実行すべきコマンド」として出すが、mise や volta などで
  // 入れた場合は効かない。install に使ったツールが何かは判定しないので、例として示す。
  const updateMessage =
    `Update available ${chalk.dim('{currentVersion}')}${chalk.reset(' → ')}${chalk.green('{latestVersion}')}\n` +
    'Update with the tool you used to install hostswitch, e.g.\n' +
    chalk.cyan('{updateCommand}');

  new UpdateChecker(packageJson).check(updateMessage);

  const program = parseCommands();

  // 引数が無い場合はインタラクティブモードを起動
  if (process.argv.length <= 2) {
    const ui = new InteractiveUserInterface(facade, logger);
    await ui.run();
  } else {
    // コマンドライン引数がある場合は通常のCLIモードで処理
    await program.parseAsync(process.argv);
  }
}

// エラーハンドリング付きで実行
main().catch((error) => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
