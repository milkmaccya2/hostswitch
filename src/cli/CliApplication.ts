import { program } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import { CommandHandler } from './commands';

export class CliApplication {
  constructor(private commandHandler: CommandHandler) {}

  setupCommands(): void {
    // Get version from package.json
    const packageJson = fs.readJsonSync(path.join(__dirname, '..', '..', 'package.json'));

    program
      .name('hostswitch')
      .description('Simple hosts file switcher')
      .version(packageJson.version);

    program
      .command('list')
      .alias('ls')
      .description('List all profiles')
      .action(async () => {
        await this.commandHandler.handleList();
      });

    program
      .command('create <name>')
      .description('Create a new profile')
      .option('-c, --from-current', 'Create from current hosts file')
      .action(async (name: string, options: { fromCurrent?: boolean }) => {
        await this.commandHandler.handleCreate(name, options.fromCurrent || false);
      });

    program
      .command('switch <name>')
      .alias('use')
      .description('Switch to a profile (requires sudo)')
      .action(async (name: string) => {
        await this.commandHandler.handleSwitch(name);
      });

    program
      .command('delete <name>')
      .alias('rm')
      .description('Delete a profile')
      .action(async (name: string) => {
        await this.commandHandler.handleDelete(name);
      });

    program
      .command('show <name>')
      .alias('cat')
      .description('Show profile content')
      .action(async (name: string) => {
        await this.commandHandler.handleShow(name);
      });

    program
      .command('edit <name>')
      .description('Edit a profile')
      .action(async (name: string) => {
        await this.commandHandler.handleEdit(name);
      });
  }

  run(): void {
    program.parse(process.argv);
  }
}