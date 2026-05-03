import { createInterface } from 'readline'
import { spawn } from 'child_process'
import { logger } from '../../utils/logger.js'
import { refreshSessionCookie, type RefreshResult } from './refresh.js'
import { formatRefreshFailure } from './messages.js'
import type { Config } from '../../config/schema.js'
import type { OnAuthFailure } from '../leetcode.js'

const LOGIN_URL = 'https://leetcode.com/accounts/login/'

export interface AuthHandlerOptions {
  autoRefresh: boolean
  interactiveRefresh: boolean
  openBrowser: boolean
  isTTY: boolean
}

export function buildOnAuthFailure(
  config: Config,
  options: AuthHandlerOptions
): OnAuthFailure | undefined {
  if (!options.autoRefresh && !options.interactiveRefresh) return undefined

  return async (attempt) => {
    if (attempt === 'auto') {
      if (!options.autoRefresh) return null
      logger.warn('Session expired. Attempting auto-refresh from browser cookie...')
      const result = await refreshSessionCookie(config, {
        browser: config.leetcode.preferredBrowser,
        interactive: false,
      })
      return handleRefreshResult(result)
    }

    if (!options.interactiveRefresh || !options.isTTY) {
      logger.warn('Browser cookie also invalid. Interactive refresh disabled.')
      return null
    }

    logger.warn('Browser cookie also invalid (you may be logged out).')
    if (options.openBrowser) {
      openLoginPage()
      logger.info(`Opening ${LOGIN_URL} in your browser...`)
    } else {
      logger.info(`Open ${LOGIN_URL} in your browser.`)
    }

    const proceed = await waitForUser('Press Enter after logging in (Ctrl+C to cancel)... ')
    if (!proceed) return null

    const result = await refreshSessionCookie(config, {
      browser: config.leetcode.preferredBrowser,
      interactive: true,
    })
    return handleRefreshResult(result)
  }
}

function handleRefreshResult(result: RefreshResult): string | null {
  if (result.ok) {
    logger.success(`Refreshed session cookie from ${result.browser} [redacted]`)
    return result.newCookie
  }
  logger.warn(`Auto-refresh failed: ${formatRefreshFailure(result)}`)
  return null
}

function openLoginPage(): void {
  try {
    spawn('open', [LOGIN_URL], { stdio: 'ignore', detached: true }).unref()
  } catch {
    // best effort
  }
}

function waitForUser(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stderr })
    rl.on('close', () => resolve(false))
    rl.question(question, () => {
      rl.close()
      resolve(true)
    })
  })
}
