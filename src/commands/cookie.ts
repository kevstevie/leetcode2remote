import { loadConfig, saveConfig } from '../config/loader.js'
import { logger } from '../utils/logger.js'
import {
  detectAllBrowsers,
  extractLeetCodeSession,
  isPlatformSupported,
} from '../services/cookie/index.js'
import type { BrowserId, ExtractionResult } from '../services/cookie/types.js'

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

export function formatExtractionFailure(result: ExtractionResult & { ok: false }): string {
  const browser = result.browser ? ` (${result.browser})` : ''
  switch (result.reason) {
    case 'unsupported_platform':
      return 'Auto cookie extraction is currently supported on macOS only.'
    case 'no_browser_detected':
      return 'No supported browser found. Install Chrome, Firefox, Edge, Brave, or Arc and log in to leetcode.com.'
    case 'browser_not_installed':
      return `Browser not installed${browser}.`
    case 'cookie_db_missing':
      return `Browser cookie database not found${browser}. Open the browser at least once and log in to leetcode.com.`
    case 'cookie_not_found':
      return `LEETCODE_SESSION cookie not found${browser}. Log in to leetcode.com in that browser, then retry.`
    case 'browser_running':
      return `Browser is running and holds the cookie database lock${browser}. Close the browser or use a different one with --browser.`
    case 'keychain_denied':
      return `macOS Keychain access was denied${browser}. Allow access when prompted, or click "Always Allow".`
    case 'decrypt_failed':
      return `Failed to decrypt cookie${browser}. The encryption format may have changed.`
    case 'native_module_missing':
      return 'Native SQLite module is unavailable. Run `npm rebuild better-sqlite3` and retry.'
    case 'invalid_cookie_format':
      return `Browser returned an invalid LEETCODE_SESSION value${browser}. You may not be logged in.`
    default:
      return `Cookie extraction failed${browser}.`
  }
}
