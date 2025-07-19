#!/usr/bin/env node

import { HostSwitchService } from './core/HostSwitchService';
import { CommandHandler } from './cli/commands';
import { CliApplication } from './cli/CliApplication';
import { FileSystemAdapter } from './infrastructure/FileSystemAdapter';
import { ChalkLogger } from './infrastructure/ChalkLogger';
import { ProcessManager } from './infrastructure/ProcessManager';
import { createConfig } from './config';

// 依存性の組み立て
const config = createConfig();
const fileSystem = new FileSystemAdapter();
const logger = new ChalkLogger();
const processManager = new ProcessManager();

// サービス層の初期化
const hostSwitchService = new HostSwitchService(fileSystem, logger, config);

// CLI層の初期化
const commandHandler = new CommandHandler(hostSwitchService, logger, processManager);
const cliApp = new CliApplication(commandHandler);

// アプリケーション起動
cliApp.setupCommands();
cliApp.run();