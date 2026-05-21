import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../../../src/services/cookie/detect.js', () => ({
  isPlatformSupported: () => true,
  detectAllBrowsers: () => [
    { browser: 'chrome', cookieDbPath: '/fake/chrome' },
    { browser: 'firefox', cookieDbPath: '/fake/firefox' },
  ],
  detectBrowser: (b: string) => ({ browser: b, cookieDbPath: `/fake/${b}` }),
}))

const extractChromiumMock = vi.fn()
const extractFirefoxMock = vi.fn()

vi.mock('../../../src/services/cookie/chrome.js', () => ({
  extractChromiumCookie: (...args: unknown[]) => extractChromiumMock(...args),
}))
vi.mock('../../../src/services/cookie/firefox.js', () => ({
  extractFirefoxCookie: (...args: unknown[]) => extractFirefoxMock(...args),
}))

describe('extractLeetCodeSession excludeValue', () => {
  beforeEach(() => {
    extractChromiumMock.mockReset()
    extractFirefoxMock.mockReset()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('skips a browser whose cookie matches excludeValue and tries the next', async () => {
    extractChromiumMock.mockResolvedValueOnce({ ok: true, value: 'stale-cookie', browser: 'chrome' })
    extractFirefoxMock.mockResolvedValueOnce({ ok: true, value: 'fresh-cookie', browser: 'firefox' })

    const { extractLeetCodeSession } = await import('../../../src/services/cookie/index.js')
    const result = await extractLeetCodeSession({ interactive: false, excludeValue: 'stale-cookie' })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBe('fresh-cookie')
      expect(result.browser).toBe('firefox')
    }
  })

  it('returns invalid_cookie_format when every browser yields the stale cookie', async () => {
    extractChromiumMock.mockResolvedValueOnce({ ok: true, value: 'stale-cookie', browser: 'chrome' })
    extractFirefoxMock.mockResolvedValueOnce({ ok: true, value: 'stale-cookie', browser: 'firefox' })

    const { extractLeetCodeSession } = await import('../../../src/services/cookie/index.js')
    const result = await extractLeetCodeSession({ interactive: false, excludeValue: 'stale-cookie' })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('invalid_cookie_format')
  })

  it('returns invalid_cookie_format when a specific stale browser is requested', async () => {
    extractChromiumMock.mockResolvedValueOnce({ ok: true, value: 'stale-cookie', browser: 'chrome' })

    const { extractLeetCodeSession } = await import('../../../src/services/cookie/index.js')
    const result = await extractLeetCodeSession({
      interactive: false,
      browser: 'chrome',
      excludeValue: 'stale-cookie',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('invalid_cookie_format')
  })

  it('returns the first fresh cookie when no excludeValue is provided', async () => {
    extractChromiumMock.mockResolvedValueOnce({ ok: true, value: 'any-cookie', browser: 'chrome' })

    const { extractLeetCodeSession } = await import('../../../src/services/cookie/index.js')
    const result = await extractLeetCodeSession({ interactive: false })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe('any-cookie')
  })
})
