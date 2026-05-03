import { Command } from 'commander'
import { submitCommand } from './commands/submit.js'
import { latestCommand } from './commands/latest.js'
import { configGetCommand, configSetCommand, configListCommand } from './commands/config.js'
import { initCommand } from './commands/init.js'
import { migrateCommand } from './commands/migrate.js'
import { readmeCommand } from './commands/readme.js'
import { cookieCommand, cookieListCommand } from './commands/cookie.js'
import { loadConfig } from './config/loader.js'
import { logger } from './utils/logger.js'
import type { BrowserId } from './services/cookie/types.js'

const VALID_BROWSERS: BrowserId[] = ['chrome', 'firefox', 'edge', 'brave', 'arc']

function parseBrowser(input: string | undefined): BrowserId | undefined {
  if (!input) return undefined
  if ((VALID_BROWSERS as string[]).includes(input)) return input as BrowserId
  logger.error(`Invalid browser: ${input}. Choose one of: ${VALID_BROWSERS.join(', ')}`)
  process.exit(1)
}

const program = new Command()

program
  .name('leetcode-commit')
  .description('Fetch your latest accepted LeetCode submission and commit it to GitHub')
  .version('1.0.0')

interface SubmitCliOptions {
  dryRun: boolean
  push: boolean
  readme: boolean
  autoRefresh: boolean
  interactiveRefresh: boolean
  openBrowser: boolean
}

function toSubmitOptions(options: SubmitCliOptions) {
  return {
    dryRun: options.dryRun,
    noPush: !options.push,
    noReadme: !options.readme,
    noAutoRefresh: !options.autoRefresh,
    noInteractiveRefresh: !options.interactiveRefresh,
    noOpenBrowser: !options.openBrowser,
  }
}

program
  .command('submit [problems...]')
  .description('Fetch accepted submission(s) and commit to GitHub')
  .option('--dry-run', 'Save files only, skip git commit and push', false)
  .option('--no-push', 'Commit but do not push to remote')
  .option('--no-readme', 'Skip auto-updating README.md after submit')
  .option('--no-auto-refresh', 'Disable automatic cookie refresh on auth failure')
  .option('--no-interactive-refresh', 'Disable interactive prompt for browser login on auth failure')
  .option('--no-open-browser', 'Do not auto-open the LeetCode login page')
  .action(async (problems: string[] | undefined, options: SubmitCliOptions) => {
    const submitOptions = toSubmitOptions(options)

    if (!problems || problems.length === 0) {
      await latestCommand(submitOptions)
      return
    }

    const problemNumbers = problems.map((p) => {
      const n = parseInt(p, 10)
      if (isNaN(n) || n <= 0) {
        logger.error(`Invalid problem number: ${p}`)
        process.exit(1)
      }
      return n
    })

    await submitCommand(problemNumbers, submitOptions)
  })

program
  .command('latest')
  .description('Fetch your most recently accepted submission across all problems and commit it')
  .option('--dry-run', 'Save files only, skip git commit and push', false)
  .option('--no-push', 'Commit but do not push to remote')
  .option('--no-readme', 'Skip auto-updating README.md after submit')
  .option('--no-auto-refresh', 'Disable automatic cookie refresh on auth failure')
  .option('--no-interactive-refresh', 'Disable interactive prompt for browser login on auth failure')
  .option('--no-open-browser', 'Do not auto-open the LeetCode login page')
  .action(async (options: SubmitCliOptions) => {
    await latestCommand(toSubmitOptions(options))
  })

const cookieCmd = program
  .command('cookie')
  .description('Auto-extract LEETCODE_SESSION cookie from your local browser')
  .option('--browser <name>', 'Browser to extract from (chrome|firefox|edge|brave|arc)')
  .option('--list', 'List detected browsers and cookie database paths')
  .action(async (options: { browser?: string; list?: boolean }) => {
    if (options.list) {
      cookieListCommand()
      return
    }
    await cookieCommand({ browser: parseBrowser(options.browser) })
  })

cookieCmd
  .command('refresh')
  .description('Force-refresh the session cookie now (same as cookie, but explicit)')
  .option('--browser <name>', 'Browser to extract from (chrome|firefox|edge|brave|arc)')
  .action(async (options: { browser?: string }) => {
    await cookieCommand({ browser: parseBrowser(options.browser) })
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
  .option('--auto-cookie', 'Auto-extract session cookie from browser instead of prompting')
  .action(async (options: { autoCookie?: boolean }) => {
    await initCommand({ autoCookie: options.autoCookie })
  })

program
  .command('migrate')
  .description('Reorganize flat problem directories into difficulty-based subdirectories (Easy/Medium/Hard)')
  .option('--dry-run', 'Preview moves without actually moving files', false)
  .option('--no-push', 'Commit but do not push to remote')
  .option('--no-readme', 'Skip auto-updating README.md after migrate')
  .action(async (options: { dryRun: boolean; push: boolean; readme: boolean }) => {
    const config = loadConfig()
    await migrateCommand(config.github.repoPath, {
      dryRun: options.dryRun,
      noPush: !options.push,
      noReadme: !options.readme,
    })
  })

program
  .command('readme')
  .description('Scan repo and update README.md with difficulty/topic charts')
  .option('--dry-run', 'Scan and report stats without writing README.md', false)
  .option('--no-commit', 'Update README.md but skip git commit')
  .option('--no-push', 'Commit README.md but do not push to remote')
  .action(
    async (options: { dryRun: boolean; commit: boolean; push: boolean }) => {
      await readmeCommand({
        dryRun: options.dryRun,
        noCommit: !options.commit,
        noPush: !options.push,
      })
    }
  )

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  logger.error(message)
  process.exit(1)
})
