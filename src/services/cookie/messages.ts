import type { ExtractionFailureReason } from './types.js'
import type { RefreshResult } from './refresh.js'

const REASONS: Record<ExtractionFailureReason | 'lock_timeout', string> = {
  unsupported_platform: 'auto-extraction not supported on this platform',
  no_browser_detected: 'no supported browser detected',
  browser_not_installed: 'browser not installed',
  cookie_db_missing: 'browser cookie database not found',
  cookie_not_found: 'LEETCODE_SESSION not found in browser (log in to leetcode.com)',
  browser_running: 'browser is running and holds the cookie database lock',
  keychain_denied: 'macOS Keychain access denied',
  decrypt_failed: 'failed to decrypt cookie',
  native_module_missing: 'better-sqlite3 native module unavailable',
  invalid_cookie_format: 'browser cookie matches the already-failing one (you may be logged out)',
  lock_timeout: 'another lcp process is refreshing; timed out',
}

/**
 * Environmental failures are not fixed by re-running `leetcode-commit cookie` — that path
 * would fail identically — so each one carries the command that actually resolves it.
 */
const REMEDIES: Partial<Record<ExtractionFailureReason | 'lock_timeout', string>> = {
  native_module_missing: 'run `npm rebuild better-sqlite3`',
  keychain_denied: 'retry and choose "Always Allow" at the Keychain prompt',
  browser_running: 'quit the browser, or pass --browser <other>',
  cookie_not_found: 'log in to leetcode.com in that browser',
  cookie_db_missing: 'open the browser once and log in to leetcode.com',
  no_browser_detected: 'install Chrome, Firefox, Edge, Brave, or Arc and log in',
}

export function formatRefreshFailure(result: RefreshResult & { ok: false }): string {
  const browser = result.browser ? ` [${result.browser}]` : ''
  const remedy = REMEDIES[result.reason]
  const suffix = remedy ? ` — ${remedy}` : ''
  return `${REASONS[result.reason] ?? 'unknown'}${browser}${suffix}`
}
