import { homedir } from 'node:os'
import type { BrowserId, ExtractionFailure, ExtractionFailureReason } from './types.js'

export type FailureReason = ExtractionFailureReason | 'lock_timeout'

export interface FailureInfo {
  readonly ok: false
  readonly reason: FailureReason
  readonly browser?: BrowserId
  readonly detail?: string
  readonly attempts?: readonly ExtractionFailure[]
}

const MANUAL_FALLBACK =
  'Or set the cookie manually: `leetcode-commit config set leetcode.sessionCookie <value>`.'

const SUMMARIES: Record<FailureReason, (where: string) => string> = {
  unsupported_platform: () => 'Auto cookie extraction is currently supported on macOS only.',
  no_browser_detected: () => 'No supported browser found.',
  browser_not_installed: (where) => `Browser not installed${where}.`,
  cookie_db_missing: (where) => `Browser cookie database not found${where}.`,
  cookie_db_unreadable: (where) => `Could not read the browser cookie database${where}.`,
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
  cookie_db_unreadable:
    'Check that the file is readable, not corrupted, and that the disk has free space, then retry. Or use a different browser with --browser.',
  cookie_not_found: 'Log in to leetcode.com in that browser, then retry.',
  browser_running: 'Close the browser or use a different one with --browser.',
  keychain_denied: 'Allow access when prompted, or click "Always Allow".',
  decrypt_failed: `The browser encryption format may have changed. Update lcp and retry. ${MANUAL_FALLBACK}`,
  native_module_missing: 'Run `npm rebuild better-sqlite3` and retry.',
  invalid_cookie_format:
    'You may be logged out, or the cookie is the one that just failed. Log in to leetcode.com in that browser again, then retry.',
  lock_timeout: 'Retry in a moment.',
}

const DETAIL_REASONS: ReadonlySet<FailureReason> = new Set<FailureReason>([
  'decrypt_failed',
  'cookie_db_unreadable',
  'browser_running',
  'invalid_cookie_format',
])

const MAX_DETAIL_LENGTH = 200
// '/' is deliberately not part of the token charset so file paths stay readable.
const TOKEN_LIKE = /[A-Za-z0-9._~+=%-]{32,}/g

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function redactHome(text: string): string {
  const home = homedir()
  if (home.length <= 1) return text
  return text.replace(new RegExp(`${escapeRegExp(home)}(?![\\w.-])`, 'g'), '~')
}

function sanitizeDetail(detail: string): string {
  const firstLine = (detail.split('\n')[0] ?? '').trim()
  const redacted = redactHome(firstLine).replace(TOKEN_LIKE, '[redacted]')
  return redacted.length > MAX_DETAIL_LENGTH ? `${redacted.slice(0, MAX_DETAIL_LENGTH)}…` : redacted
}

export function formatExtractionFailure(result: FailureInfo): string {
  const attempts = result.attempts ?? []
  if (attempts.length > 1) return formatAttempts(attempts)
  return formatSingleFailure(result)
}

function formatAttempts(attempts: readonly ExtractionFailure[]): string {
  const lines = attempts.map((attempt) => bullet(formatSingleFailure(attempt)))
  return [`Could not extract LEETCODE_SESSION from any of ${attempts.length} browsers:`, ...lines].join(
    '\n'
  )
}

function bullet(text: string): string {
  return text
    .split('\n')
    .map((line, index) => (index === 0 ? `  - ${line}` : `    ${line}`))
    .join('\n')
}

function formatSingleFailure(result: FailureInfo): string {
  const where = result.browser ? ` (${result.browser})` : ''
  const summary = SUMMARIES[result.reason](where)
  const remedy = REMEDIES[result.reason]
  const hint = result.reason === 'keychain_denied' ? mapKeychainDetail(result.detail) : ''
  const message = [summary, remedy, hint].filter(Boolean).join(' ')

  const detail =
    DETAIL_REASONS.has(result.reason) && result.detail ? sanitizeDetail(result.detail) : ''
  return detail ? `${message}\n  Detail: ${detail}` : message
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
