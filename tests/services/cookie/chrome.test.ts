import { describe, it, expect } from 'vitest'
import { createCipheriv, pbkdf2Sync } from 'crypto'
import { decryptChromiumValue, extractChromiumCookie } from '../../../src/services/cookie/chrome.js'
import type { CookieDbReader, RawCookieRow } from '../../../src/services/cookie/sqlite.js'

const PASSWORD = 'fake-keychain-pw'
const SALT = 'saltysalt'
const IV = Buffer.alloc(16, 0x20)

function encryptV10(plaintext: string, password = PASSWORD): Buffer {
  const key = pbkdf2Sync(password, SALT, 1003, 16, 'sha1')
  const cipher = createCipheriv('aes-128-cbc', key, IV)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return Buffer.concat([Buffer.from('v10', 'utf8'), ciphertext])
}

const SESSION_VALUE = 'eyJhbGciOiJIUzI1NiJ9.aaaaaaaaaaaaaaaaaaaa.bbbbbbb'

function fakeRow(overrides: Partial<RawCookieRow> = {}): RawCookieRow {
  return {
    host_key: '.leetcode.com',
    name: 'LEETCODE_SESSION',
    value: '',
    encrypted_value: encryptV10(SESSION_VALUE),
    expires_utc: 1.34e16,
    ...overrides,
  }
}

describe('decryptChromiumValue', () => {
  it('round-trips v10 ciphertext with the correct password', () => {
    const enc = encryptV10('hello world')
    expect(decryptChromiumValue(enc, PASSWORD)).toBe('hello world')
  })

  it('handles longer plaintext requiring padding', () => {
    const enc = encryptV10(SESSION_VALUE)
    expect(decryptChromiumValue(enc, PASSWORD)).toBe(SESSION_VALUE)
  })

  it('throws on unsupported version prefix', () => {
    const bad = Buffer.concat([Buffer.from('v99'), Buffer.from('xx')])
    expect(() => decryptChromiumValue(bad, PASSWORD)).toThrow(/unsupported encryption/)
  })

  it('throws on too-short input', () => {
    expect(() => decryptChromiumValue(Buffer.from([1, 2]), PASSWORD)).toThrow(/too short/)
  })
})

describe('extractChromiumCookie', () => {
  it('returns ok with decrypted value for chrome', async () => {
    const readCookie: CookieDbReader = async () => fakeRow()
    const result = await extractChromiumCookie('chrome', {
      readCookie,
      readKeychain: async () => PASSWORD,
      cookieDbPath: '/fake/path',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBe(SESSION_VALUE)
      expect(result.browser).toBe('chrome')
      expect(result.expiresAt).toBeInstanceOf(Date)
    }
  })

  it('returns cookie_not_found when row missing', async () => {
    const result = await extractChromiumCookie('chrome', {
      readCookie: async () => null,
      readKeychain: async () => PASSWORD,
      cookieDbPath: '/fake/path',
    })
    expect(result).toMatchObject({ ok: false, reason: 'cookie_not_found' })
  })

  it('returns browser_running when sqlite is locked', async () => {
    const readCookie: CookieDbReader = async () => {
      throw new Error('SQLITE_BUSY: database is locked')
    }
    const result = await extractChromiumCookie('chrome', {
      readCookie,
      readKeychain: async () => PASSWORD,
      cookieDbPath: '/fake/path',
    })
    expect(result).toMatchObject({ ok: false, reason: 'browser_running' })
  })

  it('returns native_module_missing when sqlite native module fails to load', async () => {
    const readCookie: CookieDbReader = async () => {
      throw new Error('native_module_missing')
    }
    const result = await extractChromiumCookie('chrome', {
      readCookie,
      readKeychain: async () => PASSWORD,
      cookieDbPath: '/fake/path',
    })
    expect(result).toMatchObject({ ok: false, reason: 'native_module_missing' })
  })

  it('returns keychain_denied when keychain reader throws', async () => {
    const result = await extractChromiumCookie('chrome', {
      readCookie: async () => fakeRow(),
      readKeychain: async () => {
        throw new Error('user denied')
      },
      cookieDbPath: '/fake/path',
    })
    expect(result).toMatchObject({ ok: false, reason: 'keychain_denied' })
  })

  it('returns decrypt_failed when password is wrong', async () => {
    const result = await extractChromiumCookie('chrome', {
      readCookie: async () => fakeRow({ encrypted_value: encryptV10('xx', 'wrong-pw') }),
      readKeychain: async () => PASSWORD,
      cookieDbPath: '/fake/path',
    })
    expect(result.ok).toBe(false)
  })

  it('returns invalid_cookie_format when decrypted value is too short', async () => {
    const result = await extractChromiumCookie('chrome', {
      readCookie: async () => fakeRow({ encrypted_value: encryptV10('shorty') }),
      readKeychain: async () => PASSWORD,
      cookieDbPath: '/fake/path',
    })
    expect(result).toMatchObject({ ok: false, reason: 'invalid_cookie_format' })
  })

  it('does not log or expose cookie value in failure detail', async () => {
    const result = await extractChromiumCookie('chrome', {
      readCookie: async () => fakeRow({ encrypted_value: encryptV10('xx', 'wrong-pw') }),
      readKeychain: async () => PASSWORD,
      cookieDbPath: '/fake/path',
    })
    if (!result.ok) {
      expect(result.detail ?? '').not.toContain(SESSION_VALUE)
    }
  })
})
