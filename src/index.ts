import { Command } from 'commander'
import { submitCommand } from './commands/submit.js'
import { configGetCommand, configSetCommand, configListCommand } from './commands/config.js'
import { initCommand } from './commands/init.js'
import { migrateCommand } from './commands/migrate.js'
import { loadConfig } from './config/loader.js'
import { logger } from './utils/logger.js'

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
  .command('migrate')
  .description('Reorganize flat problem directories into difficulty-based subdirectories (Easy/Medium/Hard)')
  .option('--dry-run', 'Preview moves without actually moving files', false)
  .option('--no-push', 'Commit but do not push to remote')
  .action(async (options: { dryRun: boolean; push: boolean }) => {
    const config = loadConfig()
    await migrateCommand(config.github.repoPath, { dryRun: options.dryRun, noPush: !options.push })
  })

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  logger.error(message)
  process.exit(1)
})
