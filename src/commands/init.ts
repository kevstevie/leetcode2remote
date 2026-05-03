import { createInterface } from 'readline'
import { existsSync } from 'fs'
import { saveConfig, configExists, getConfigPath } from '../config/loader.js'
import { logger } from '../utils/logger.js'
import { extractLeetCodeSession, isPlatformSupported } from '../services/cookie/index.js'
import { formatExtractionFailure } from './cookie.js'

function prompt(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve))
}

export interface InitOptions {
  autoCookie?: boolean
}

export async function initCommand(options: InitOptions = {}): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })

  try {
    if (configExists()) {
      const overwrite = await prompt(
        rl,
        `Config already exists at ${getConfigPath()}. Overwrite? (y/N) `
      )
      if (overwrite.toLowerCase() !== 'y') {
        logger.info('Init cancelled.')
        return
      }
    }

    console.log('\nWelcome to leetcode-commit setup!\n')

    let sessionCookie = ''
    if (options.autoCookie && isPlatformSupported()) {
      logger.step('Auto-extracting LEETCODE_SESSION from your browser...')
      const result = await extractLeetCodeSession({ interactive: true })
      if (result.ok) {
        sessionCookie = result.value
        logger.success(`Extracted from ${result.browser} [redacted]`)
      } else {
        logger.warn(formatExtractionFailure(result))
      }
    }

    if (!sessionCookie) {
      console.log('To get your LeetCode session cookie:')
      console.log('  Option A (auto): close this, run `leetcode-commit init --auto-cookie`')
      console.log('  Option B (manual):')
      console.log('    1. Log in to leetcode.com in your browser')
      console.log('    2. Open DevTools → Application → Cookies → https://leetcode.com')
      console.log("    3. Copy the value of the 'LEETCODE_SESSION' cookie\n")

      const value = await prompt(rl, 'LeetCode session cookie (LEETCODE_SESSION value): ')
      sessionCookie = value.trim()
      if (!sessionCookie) {
        logger.error('Session cookie cannot be empty')
        process.exit(1)
      }
    }

    const csrfToken = await prompt(rl, 'CSRF token (optional, press Enter to skip): ')

    const enableAutoRefresh = await prompt(
      rl,
      'Enable auto-refresh of session cookie when it expires? (Y/n) '
    )
    const autoRefresh = enableAutoRefresh.trim().toLowerCase() !== 'n'

    console.log('\nGitHub repository path:')
    console.log('  This should be a local path to your git-cloned repository')
    console.log('  Example: /Users/yourname/leetcode-solutions\n')

    const repoPath = await prompt(rl, 'Local path to GitHub repository: ')
    if (!repoPath.trim()) {
      logger.error('Repository path cannot be empty')
      process.exit(1)
    }

    if (!existsSync(repoPath.trim())) {
      logger.warn(`Path does not exist: ${repoPath.trim()}`)
      const cont = await prompt(rl, 'Continue anyway? (y/N) ')
      if (cont.toLowerCase() !== 'y') {
        logger.info('Init cancelled.')
        return
      }
    }

    saveConfig({
      leetcode: {
        sessionCookie,
        ...(csrfToken.trim() ? { csrfToken: csrfToken.trim() } : {}),
        autoRefresh,
      },
      github: {
        repoPath: repoPath.trim(),
      },
    })

    logger.success(`Config saved to ${getConfigPath()}`)
    console.log('\nYou are ready to use leetcode-commit!')
    console.log('  Example: leetcode-commit submit 1')
  } finally {
    rl.close()
  }
}
