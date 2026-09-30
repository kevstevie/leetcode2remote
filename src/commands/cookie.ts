import { loadConfig, saveConfig } from '../config/loader.js'
import { logger } from '../utils/logger.js'
import {
  detectAllBrowsers,
  extractLeetCodeSession,
  isPlatformSupported,
} from '../services/cookie/index.js'
import { formatExtractionFailure } from '../services/cookie/messages.js'
import type { BrowserId } from '../services/cookie/types.js'

export interface CookieOptions {
  browser?: BrowserId
}

export async function cookieCommand(opts: CookieOptions): Promise<void> {
  if (!isPlatformSupported()) {
    logger.error('Auto cookie extraction is currently supported on macOS only.')
    process.exit(1)
  }

  logger.step(opts.browser ? `Extracting from ${opts.browser}...` : 'Extracting from detected browser...')

  const result = await extractLeetCodeSession({ browser: opts.browser, interactive: true })

  if (!result.ok) {
    logger.error(formatExtractionFailure(result))
    process.exit(1)
  }

  const config = loadConfig()
  saveConfig({
    ...config,
    leetcode: {
      ...config.leetcode,
      sessionCookie: result.value,
    },
  })

  logger.success(`Session cookie updated from ${result.browser} [redacted]`)
  if (result.expiresAt) {
    logger.info(`Browser cookie expires: ${result.expiresAt.toISOString()}`)
  }
}

export function cookieListCommand(): void {
  if (!isPlatformSupported()) {
    logger.warn('Auto cookie extraction is currently supported on macOS only.')
    return
  }
  const detected = detectAllBrowsers()
  if (detected.length === 0) {
    console.log('No supported browsers detected.')
    return
  }
  console.log('Detected browsers:')
  for (const { browser, cookieDbPath } of detected) {
    console.log(`  - ${browser}: ${cookieDbPath}`)
  }
}
