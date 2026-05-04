import { createDecipheriv, pbkdf2Sync } from 'crypto'
import { realChromiumCookieReader, type CookieDbReader } from './sqlite.js'
import { realKeychainReader, type KeychainReader } from './keychain.js'
import { getBrowserPaths } from './paths.js'
import type { BrowserId, ExtractionResult } from './types.js'

const SALT = 'saltysalt'
const ITERATIONS = 1003
const KEY_LENGTH = 16
const IV = Buffer.alloc(16, 0x20)
const COOKIE_HOST = 'leetcode.com'
const COOKIE_NAME = 'LEETCODE_SESSION'
const HOST_HASH_LENGTH = 32

export interface ChromiumExtractDeps {
  readCookie?: CookieDbReader
  readKeychain?: KeychainReader
  cookieDbPath?: string
}

export async function extractChromiumCookie(
  browser: Exclude<BrowserId, 'firefox'>,
  deps: ChromiumExtractDeps = {}
): Promise<ExtractionResult> {
  const readCookie = deps.readCookie ?? realChromiumCookieReader
  const readKeychain = deps.readKeychain ?? realKeychainReader
  const paths = getBrowserPaths(browser)
  const dbPath = deps.cookieDbPath ?? paths.cookieDb
  const serviceName = paths.keychainServiceName

  if (!serviceName) {
    return { ok: false, reason: 'browser_not_installed', browser }
  }

  let row
  try {
    row = await readCookie(dbPath, COOKIE_HOST, COOKIE_NAME)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message === 'native_module_missing') {
      return { ok: false, reason: 'native_module_missing', browser }
    }
    if (message.includes('SQLITE_BUSY') || message.includes('locked')) {
      return { ok: false, reason: 'browser_running', browser, detail: message }
    }
    if (message.includes('ENOENT')) {
      return { ok: false, reason: 'cookie_db_missing', browser }
    }
    return { ok: false, reason: 'decrypt_failed', browser, detail: message }
  }

  if (!row) {
    return { ok: false, reason: 'cookie_not_found', browser }
  }

  let password: string
  try {
    password = await readKeychain(serviceName)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, reason: 'keychain_denied', browser, detail: message }
  }

  let plaintext: string
  try {
    plaintext = decryptChromiumValue(row.encrypted_value, password)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, reason: 'decrypt_failed', browser, detail: message }
  }

  if (!plaintext) {
    return { ok: false, reason: 'cookie_not_found', browser }
  }

  if (!isPlausibleSession(plaintext)) {
    return { ok: false, reason: 'invalid_cookie_format', browser }
  }

  return {
    ok: true,
    value: plaintext,
    browser,
    expiresAt: chromiumExpiryToDate(row.expires_utc),
  }
}

export function decryptChromiumValue(encrypted: Buffer, password: string): string {
  if (encrypted.length < 4) {
    throw new Error('encrypted value too short')
  }
  const prefix = encrypted.subarray(0, 3).toString('utf8')
  if (prefix !== 'v10' && prefix !== 'v11') {
    throw new Error(`unsupported encryption version: ${prefix}`)
  }
  const ciphertext = encrypted.subarray(3)
  const key = pbkdf2Sync(password, SALT, ITERATIONS, KEY_LENGTH, 'sha1')
  const decipher = createDecipheriv('aes-128-cbc', key, IV)
  decipher.setAutoPadding(false)
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return stripHostHashPrefix(stripPkcs7(decrypted)).toString('utf8')
}

function stripHostHashPrefix(buf: Buffer): Buffer {
  if (buf.length <= HOST_HASH_LENGTH) return buf
  for (let i = 0; i < HOST_HASH_LENGTH; i++) {
    const byte = buf[i]
    if (byte < 0x20 || byte > 0x7e) {
      return buf.subarray(HOST_HASH_LENGTH)
    }
  }
  return buf
}

function stripPkcs7(buf: Buffer): Buffer {
  if (buf.length === 0) return buf
  const pad = buf[buf.length - 1]
  if (pad > 0 && pad <= 16 && buf.length >= pad) {
    let valid = true
    for (let i = buf.length - pad; i < buf.length; i++) {
      if (buf[i] !== pad) {
        valid = false
        break
      }
    }
    if (valid) return buf.subarray(0, buf.length - pad)
  }
  return buf
}

function chromiumExpiryToDate(expiresUtc: number): Date | undefined {
  if (!expiresUtc || expiresUtc <= 0) return undefined
  const epochDeltaMs = 11644473600000
  const ms = Math.floor(expiresUtc / 1000) - epochDeltaMs
  if (ms <= 0) return undefined
  return new Date(ms)
}

function isPlausibleSession(value: string): boolean {
  if (value.length < 20 || value.length > 4000) return false
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code < 0x20 || code > 0x7e) return false
  }
  return true
}
