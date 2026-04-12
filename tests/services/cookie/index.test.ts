import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractLeetCodeSession } from '../../../src/services/cookie/index.js'

vi.mock('../../../src/services/cookie/detect.js', () => ({
  detectBrowsers: vi.fn(),
  getBrowserCookiePath: vi.fn(),
}))

vi.mock('../../../src/services/cookie/chrome.js', () => ({
  extractChromeCookie: vi.fn(),
}))

vi.mock('../../../src/services/cookie/firefox.js', () => ({
  extractFirefoxCookie: vi.fn(),
}))

import { detectBrowsers, getBrowserCookiePath } from '../../../src/services/cookie/detect.js'
import { extractChromeCookie } from '../../../src/services/cookie/chrome.js'
import { extractFirefoxCookie } from '../../../src/services/cookie/firefox.js'

describe('extractLeetCodeSession', () => {
  beforeEach(() => {
    vi.mocked(detectBrowsers).mockReset()
    vi.mocked(getBrowserCookiePath).mockReset()
    vi.mocked(extractChromeCookie).mockReset()
    vi.mocked(extractFirefoxCookie).mockReset()
  })

  it('extracts from chrome when specified', () => {
    vi.mocked(getBrowserCookiePath).mockReturnValue('/path/to/Cookies')
    vi.mocked(extractChromeCookie).mockReturnValue('chrome-session')

    const result = extractLeetCodeSession({ browser: 'chrome' })
    expect(result).toBe('chrome-session')
    expect(extractChromeCookie).toHaveBeenCalledWith('/path/to/Cookies', 'Chrome Safe Storage')
  })

  it('extracts from firefox when specified', () => {
    vi.mocked(getBrowserCookiePath).mockReturnValue('/path/to/cookies.sqlite')
    vi.mocked(extractFirefoxCookie).mockReturnValue('firefox-session')

    const result = extractLeetCodeSession({ browser: 'firefox' })
    expect(result).toBe('firefox-session')
    expect(extractFirefoxCookie).toHaveBeenCalledWith('/path/to/cookies.sqlite')
  })

  it('auto-detects first available browser', () => {
    vi.mocked(detectBrowsers).mockReturnValue([{ name: 'chrome', cookiePath: '/path/Cookies' }])
    vi.mocked(getBrowserCookiePath).mockReturnValue('/path/Cookies')
    vi.mocked(extractChromeCookie).mockReturnValue('auto-session')

    const result = extractLeetCodeSession({})
    expect(result).toBe('auto-session')
  })

  it('throws when no browsers detected in auto mode', () => {
    vi.mocked(detectBrowsers).mockReturnValue([])

    expect(() => extractLeetCodeSession({})).toThrow('No supported browsers detected')
  })

  it('throws when extraction fails for all detected browsers', () => {
    vi.mocked(detectBrowsers).mockReturnValue([
      { name: 'chrome', cookiePath: '/path/Cookies' },
      { name: 'firefox', cookiePath: '/path/cookies.sqlite' },
    ])
    vi.mocked(getBrowserCookiePath).mockReturnValue('/path/Cookies')
    vi.mocked(extractChromeCookie).mockImplementation(() => {
      throw new Error('Keychain access denied')
    })
    vi.mocked(extractFirefoxCookie).mockImplementation(() => {
      throw new Error('DB locked')
    })

    expect(() => extractLeetCodeSession({})).toThrow('Failed to extract')
  })
})
