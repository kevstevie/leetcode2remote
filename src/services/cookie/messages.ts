import type { BrowserId, ExtractionFailureReason } from './types.js'

export type FailureReason = ExtractionFailureReason | 'lock_timeout'

export interface FailureInfo {
  readonly ok: false
  readonly reason: FailureReason
  readonly browser?: BrowserId
  readonly detail?: string
}

const MANUAL_FALLBACK =
  'Or set the cookie manually: `leetcode-commit config set leetcode.sessionCookie <value>`.'

const SUMMARIES: Record<FailureReason, (where: string) => string> = {
  unsupported_platform: () => 'Auto cookie extraction is currently supported on macOS only.',
  no_browser_detected: () => 'No supported browser found.',
  browser_not_installed: (where) => `Browser not installed${where}.`,
  cookie_db_missing: (where) => `Browser cookie database not found${where}.`,
  cookie_not_found: (where) => `LEETCODE_SESSION cookie not found${where}.`,
  browser_running: (where) => `Browser is running and holds the cookie database lock${where}.`,
  keychain_denied: (where) => `macOS Keychain access was denied${where}.`,
  decrypt_failed: (where) => `Failed to decrypt cookie${where}.`,
  native_module_missing: () => 'Native SQLite module is unavailable.',
  invalid_cookie_format: (where) => `Browser returned an unusable LEETCODE_SESSION value${where}.`,
  lock_timeout: () => 'Another lcp process is refreshing the cookie; timed out waiting for it.',
}

const REMEDIES: Record<FailureReason, string> = {
  unsupported_platform: MANUAL_FALLBACK,
  no_browser_detected: 'Install Chrome, Firefox, Edge, Brave, or Arc and log in to leetcode.com.',
  browser_not_installed: 'Install it, or pick another one with --browser <chrome|firefox|edge|brave|arc>.',
  cookie_db_missing: 'Open the browser at least once and log in to leetcode.com.',
  cookie_not_found: 'Log in to leetcode.com in that browser, then retry.',
  browser_running: 'Close the browser or use a different one with --browser.',
  keychain_denied: 'Allow access when prompted, or click "Always Allow".',
  decrypt_failed: `The browser encryption format may have changed. Update lcp and retry. ${MANUAL_FALLBACK}`,
  native_module_missing: 'Run `npm rebuild better-sqlite3` and retry.',
  invalid_cookie_format:
    'You may be logged out, or the cookie is the one that just failed. Log in to leetcode.com in that browser again, then retry.',
  lock_timeout: 'Retry in a moment.',
}

export function formatExtractionFailure(result: FailureInfo): string {
  const where = result.browser ? ` (${result.browser})` : ''
  const summary = SUMMARIES[result.reason](where)
  const remedy = REMEDIES[result.reason]
  const hint = result.reason === 'keychain_denied' ? mapKeychainDetail(result.detail) : ''
  return [summary, remedy, hint].filter(Boolean).join(' ')
}

function mapKeychainDetail(detail: string | undefined): string {
  if (!detail) return ''
  const lower = detail.toLowerCase()
  if (lower.includes('user canceled') || lower.includes('user cancelled')) {
    return 'Looks like the prompt was canceled — retry and click "Always Allow".'
  }
  if (lower.includes('user interaction is not allowed') || lower.includes('errsecinteractionnotallowed')) {
    return 'Keychain interaction is currently disabled (e.g. screen locked).'
  }
  if (lower.includes('could not be found') || lower.includes('errsecitemnotfound')) {
    return 'Keychain entry not found — the browser may not be installed or has not stored a key yet.'
  }
  if (lower.includes('authentication failed') || lower.includes('errsecauthfailed')) {
    return 'Keychain authentication failed.'
  }
  return ''
}
