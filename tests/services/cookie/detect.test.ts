import { describe, it, expect, vi, beforeEach } from 'vitest'
import { detectBrowsers, getBrowserCookiePath } from '../../../src/services/cookie/detect.js'

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return {
    ...actual,
    existsSync: vi.fn(),
    readdirSync: vi.fn(),
  }
})

import { existsSync, readdirSync } from 'fs'

describe('detectBrowsers', () => {
  beforeEach(() => {
    vi.mocked(existsSync).mockReset()
    vi.mocked(readdirSync).mockReset()
  })

  it('returns chrome when chrome profile exists', () => {
    vi.mocked(existsSync).mockImplementation((p) =>
      typeof p === 'string' && p.includes('Google/Chrome') && p.endsWith('Cookies')
    )
    const browsers = detectBrowsers()
    expect(browsers.some((b) => b.name === 'chrome')).toBe(true)
  })

  it('returns firefox when firefox profile exists', () => {
    vi.mocked(existsSync).mockImplementation((p) =>
      typeof p === 'string' && p.includes('Firefox')
    )
    vi.mocked(readdirSync).mockReturnValue(['abc123.default-release'] as never)
    const browsers = detectBrowsers()
    expect(browsers.some((b) => b.name === 'firefox')).toBe(true)
  })

  it('returns empty array when no browsers found', () => {
    vi.mocked(existsSync).mockReturnValue(false)
    const browsers = detectBrowsers()
    expect(browsers).toHaveLength(0)
  })

  it('detects brave separately from chrome', () => {
    vi.mocked(existsSync).mockImplementation((p) =>
      typeof p === 'string' && p.includes('BraveSoftware') && p.endsWith('Cookies')
    )
    const browsers = detectBrowsers()
    expect(browsers.some((b) => b.name === 'brave')).toBe(true)
  })
})

describe('getBrowserCookiePath', () => {
  beforeEach(() => {
    vi.mocked(existsSync).mockReset()
    vi.mocked(readdirSync).mockReset()
  })

  it('returns chrome cookie path', () => {
    const result = getBrowserCookiePath('chrome')
    expect(result).toContain('Google/Chrome')
    expect(result).toContain('Cookies')
  })

  it('returns firefox cookie path with profile directory', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readdirSync).mockReturnValue(['abc123.default-release'] as never)
    const result = getBrowserCookiePath('firefox')
    expect(result).toContain('Firefox')
  })

  it('returns brave cookie path', () => {
    const result = getBrowserCookiePath('brave')
    expect(result).toContain('BraveSoftware')
  })

  it('throws for unknown browser', () => {
    expect(() => getBrowserCookiePath('ie' as never)).toThrow('Unsupported browser')
  })
})
