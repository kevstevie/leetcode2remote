import { Command } from 'commander'
import { submitCommand } from './commands/submit.js'
import { configGetCommand, configSetCommand, configListCommand } from './commands/config.js'
import { initCommand } from './commands/init.js'
import { cookieCommand, cookieListCommand } from './commands/cookie.js'
import { logger } from './utils/logger.js'
import type { BrowserName } from './services/cookie/types.js'

const program = new Command()

program
  .name('leetcode-commit')
  .description('Fetch your latest accepted LeetCode submission and commit it to GitHub')
  .version('1.0.0')

program
  .command('submit <problems...>')
  .description('Fetch accepted submission(s) and commit to GitHub')
  .option('--dry-run', 'Save files only, skip git commit and push', false)
  .option('--no-push', 'Commit but do not push to remote')
  .action(async (problems: string[], options: { dryRun: boolean; push: boolean }) => {
    const problemNumbers = problems.map((p) => {
      const n = parseInt(p, 10)
      if (isNaN(n) || n <= 0) {
        logger.error(`Invalid problem number: ${p}`)
        process.exit(1)
      }
      return n
    })

    await submitCommand(problemNumbers, {
      dryRun: options.dryRun,
      noPush: !options.push,
    })
  })

const configCmd = program
  .command('config')
  .description('Manage configuration settings')

configCmd
  .command('list')
  .description('Show current configuration')
  .action(() => configListCommand())

configCmd
  .command('get <key>')
  .description('Get a config value (e.g. github.repoPath)')
  .action((key) => configGetCommand(key))

configCmd
  .command('set <key> <value>')
  .description('Set a config value (e.g. github.repoPath /path/to/repo)')
  .action((key, value) => configSetCommand(key, value))

program
  .command('init')
  .description('Interactive setup: create config file with credentials')
  .action(async () => {
    await initCommand()
  })

program
  .command('cookie')
  .description('Auto-extract LEETCODE_SESSION cookie from browser and save to config')
  .option('--browser <name>', 'Browser to extract from (chrome|firefox|brave|edge|arc)')
  .option('--list', 'List detected browsers and cookie status')
  .action(async (options: { browser?: string; list?: boolean }) => {
    if (options.list) {
      cookieListCommand()
      return
    }
    await cookieCommand({ browser: options.browser as BrowserName | undefined })
  })

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  logger.error(message)
  process.exit(1)
})
