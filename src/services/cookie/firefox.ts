import { realFirefoxCookieReader, type FirefoxDbReader } from './sqlite.js'
import { detectBrowser } from './detect.js'
import type { ExtractionResult } from './types.js'

const COOKIE_HOST = 'leetcode.com'
const COOKIE_NAME = 'LEETCODE_SESSION'

export interface FirefoxExtractDeps {
  readCookie?: FirefoxDbReader
  cookieDbPath?: string
}

export async function extractFirefoxCookie(
  deps: FirefoxExtractDeps = {}
): Promise<ExtractionResult> {
  const readCookie = deps.readCookie ?? realFirefoxCookieReader
  const dbPath = deps.cookieDbPath ?? detectBrowser('firefox')?.cookieDbPath

  if (!dbPath) {
    return { ok: false, reason: 'cookie_db_missing', browser: 'firefox' }
  }

  let row
  try {
    row = await readCookie(dbPath, COOKIE_HOST, COOKIE_NAME)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message === 'native_module_missing') {
      return { ok: false, reason: 'native_module_missing', browser: 'firefox' }
    }
    if (message.includes('SQLITE_BUSY') || message.includes('locked')) {
      return { ok: false, reason: 'browser_running', browser: 'firefox', detail: message }
    }
    return { ok: false, reason: 'decrypt_failed', browser: 'firefox', detail: message }
  }

  if (!row) {
    return { ok: false, reason: 'cookie_not_found', browser: 'firefox' }
  }

  if (!row.value || !isPlausibleSession(row.value)) {
    return { ok: false, reason: 'invalid_cookie_format', browser: 'firefox' }
  }

  return {
    ok: true,
    value: row.value,
    browser: 'firefox',
    expiresAt: firefoxExpiryToDate(row.expiry),
  }
}

function firefoxExpiryToDate(expiry: number): Date | undefined {
  if (!expiry || expiry <= 0) return undefined
  return new Date(expiry * 1000)
}

function isPlausibleSession(value: string): boolean {
  if (value.length < 20 || value.length > 4000) return false
  if (/[\r\n]/.test(value)) return false
  return true
}
