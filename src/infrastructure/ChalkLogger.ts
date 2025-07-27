import chalk from 'chalk';
import type { ILogger } from '../interfaces';

export class ChalkLogger implements ILogger {
  info(message: string): void {
    console.log(message);
  }

  warn(message: string): void {
    console.log(chalk.yellow(message));
  }

  warning(message: string): void {
    console.log(chalk.yellow(message));
  }

  error(message: string): void {
    console.error(chalk.red(`Error: ${message}`));
  }

  success(message: string): void {
    console.log(chalk.green(message));
  }

  dim(message: string): void {
    console.log(chalk.dim(message));
  }

  bold(message: string): void {
    console.log(chalk.bold(message));
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.DEBUG) {
      console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
    }
  }
}
