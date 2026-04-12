import { extractLeetCodeSession, listDetectedBrowsers } from '../services/cookie/index.js'
import { loadConfig, saveConfig } from '../config/loader.js'
import { logger } from '../utils/logger.js'
import type { Config } from '../config/schema.js'
import type { BrowserName } from '../services/cookie/types.js'

export interface CookieCommandOptions {
  browser?: BrowserName
}

export async function cookieCommand(options: CookieCommandOptions): Promise<void> {
  logger.info('Extracting LEETCODE_SESSION cookie from browser...')

  const sessionCookie = extractLeetCodeSession({ browser: options.browser })
  logger.success('Cookie extracted successfully')

  let config: Config
  try {
    const existing = loadConfig()
    config = {
      ...existing,
      leetcode: { ...existing.leetcode, sessionCookie },
    }
  } catch {
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
    logger.info(`  ✓ ${browser.name}: ${browser.cookiePath}`)
  }
}
