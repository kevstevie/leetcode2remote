import { extractLeetCodeSession, listDetectedBrowsers } from '../services/cookie/index.js'
import { loadConfig, saveConfig, configExists } from '../config/loader.js'
import { logger } from '../utils/logger.js'
import type { BrowserName } from '../services/cookie/types.js'

export interface CookieCommandOptions {
  browser?: BrowserName
}

export async function cookieCommand(options: CookieCommandOptions): Promise<void> {
  logger.info('Extracting LEETCODE_SESSION cookie from browser...')

  const sessionCookie = extractLeetCodeSession({ browser: options.browser })
  logger.success('Cookie extracted successfully')

  let config: { leetcode: { sessionCookie: string; csrfToken?: string }; github: { repoPath: string } }

  if (configExists()) {
    const existing = loadConfig()
    config = {
      ...existing,
      leetcode: {
        ...existing.leetcode,
        sessionCookie,
      },
    }
  } else {
    config = {
      leetcode: { sessionCookie },
      github: { repoPath: '' },
    }
  }

  saveConfig(config)
  logger.success('Config updated with new session cookie')
}

export function cookieListCommand(): void {
  const browsers = listDetectedBrowsers()

  if (browsers.length === 0) {
    logger.warn('No supported browsers detected on this system')
    return
  }

  logger.info('Detected browsers:')
  for (const browser of browsers) {
    const status = browser.available ? '✓' : '✗'
    console.log(`  ${status} ${browser.name}: ${browser.cookiePath}`)
  }
}
