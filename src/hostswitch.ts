#!/usr/bin/env node

import { Command } from 'commander';
import { CliController } from './cli/CliController';
import { HostSwitchFacade } from './cli/HostSwitchFacade';
import { CliUserInterface } from './cli/ui/CliUserInterface';
import { InteractiveUserInterface } from './cli/ui/InteractiveUserInterface';
import { createConfig } from './config';
import { HostSwitchService } from './core/HostSwitchService';
import { ChalkLogger } from './infrastructure/ChalkLogger';
import { FileSystemAdapter } from './infrastructure/FileSystemAdapter';
import { PermissionChecker } from './infrastructure/PermissionChecker';
import { ProcessManager } from './infrastructure/ProcessManager';

// 依存性の組み立て
const config = createConfig();
const fileSystem = new FileSystemAdapter();
const logger = new ChalkLogger();
const processManager = new ProcessManager();
const permissionChecker = new PermissionChecker();

// サービス層の初期化
const hostSwitchService = new HostSwitchService(fileSystem, logger, config, permissionChecker);

// Facade層の初期化
const facade = new HostSwitchFacade(hostSwitchService, processManager, permissionChecker);

// コマンドライン引数の解析
function parseCommands() {
  const program = new Command();

  program
    .name('hostswitch')
    .description('A CLI tool for switching hosts file profiles')
    .version('1.0.6');

  // List profiles command
  program
    .command('list')
    .alias('ls')
    .description('List all profiles')
    .action(async () => {
      const ui = new CliUserInterface(logger);
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
      const ui = new CliUserInterface(logger);
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
    .description('Switch to a profile (requires sudo)')
    .action(async (name: string) => {
      const ui = new CliUserInterface(logger);
      const controller = new CliController(facade, ui);
      await controller.executeCommand('switch', { name });
    });

  // Show profile command
  program
    .command('show')
    .alias('cat')
    .argument('<name>', 'Profile name')
    .description('Show profile contents')
    .action(async (name: string) => {
      const ui = new CliUserInterface(logger);
      const controller = new CliController(facade, ui);
      await controller.executeCommand('show', { name });
    });

  // Edit profile command
  program
    .command('edit')
    .argument('<name>', 'Profile name')
    .description('Edit a profile')
    .action(async (name: string) => {
      const ui = new CliUserInterface(logger);
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
      const ui = new CliUserInterface(logger);
      const controller = new CliController(facade, ui);
      await controller.executeCommand('delete', {
        name,
        force: options.force || false,
      });
    });

  return program;
}

// アプリケーション起動
async function main() {
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
