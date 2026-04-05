import chalk from 'chalk'

export const logger = {
  info: (msg: string) => console.error(chalk.blue('ℹ'), msg),
  success: (msg: string) => console.error(chalk.green('✓'), msg),
  warn: (msg: string) => console.error(chalk.yellow('⚠'), msg),
  error: (msg: string) => console.error(chalk.red('✗'), msg),
  step: (msg: string) => console.error(chalk.gray('→'), msg),
}
