import { describe, it, expect } from 'vitest'
import { extractFirefoxCookie } from '../../../src/services/cookie/firefox.js'
import type { FirefoxDbReader } from '../../../src/services/cookie/sqlite.js'

const SESSION_VALUE = 'firefox-session-value-aaaaaaaaaaaa'

describe('extractFirefoxCookie', () => {
  it('returns ok with plaintext value', async () => {
    const readCookie: FirefoxDbReader = async () => ({
      host: '.leetcode.com',
      name: 'LEETCODE_SESSION',
      value: SESSION_VALUE,
      expiry: 1900000000,
    })
    const result = await extractFirefoxCookie({
      readCookie,
      cookieDbPath: '/fake/firefox.sqlite',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBe(SESSION_VALUE)
      expect(result.browser).toBe('firefox')
      expect(result.expiresAt).toBeInstanceOf(Date)
    }
  })

  it('returns cookie_db_missing when no path detected', async () => {
    const result = await extractFirefoxCookie({
      readCookie: async () => null,
    })
    expect(result.ok).toBe(false)
  })

  it('returns cookie_not_found when row missing', async () => {
    const result = await extractFirefoxCookie({
      readCookie: async () => null,
      cookieDbPath: '/fake/firefox.sqlite',
    })
    expect(result).toMatchObject({ ok: false, reason: 'cookie_not_found' })
  })

  it('returns browser_running when sqlite is locked', async () => {
    const readCookie: FirefoxDbReader = async () => {
      throw new Error('database is locked')
    }
    const result = await extractFirefoxCookie({
      readCookie,
      cookieDbPath: '/fake/firefox.sqlite',
    })
    expect(result).toMatchObject({ ok: false, reason: 'browser_running' })
  })

  it('returns invalid_cookie_format when value is empty or short', async () => {
    const readCookie: FirefoxDbReader = async () => ({
      host: '.leetcode.com',
      name: 'LEETCODE_SESSION',
      value: 'tiny',
      expiry: 1900000000,
    })
    const result = await extractFirefoxCookie({
      readCookie,
      cookieDbPath: '/fake/firefox.sqlite',
    })
    expect(result).toMatchObject({ ok: false, reason: 'invalid_cookie_format' })
  })
})
