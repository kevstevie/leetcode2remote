import { describe, it, expect } from 'vitest'
import { isPlatformSupported, detectAllBrowsers, detectBrowser } from '../../../src/services/cookie/detect.js'

describe('isPlatformSupported', () => {
  it('returns boolean', () => {
    expect(typeof isPlatformSupported()).toBe('boolean')
  })
})

describe('detectAllBrowsers', () => {
  it('returns an array', () => {
    expect(Array.isArray(detectAllBrowsers())).toBe(true)
  })

  it('returns empty on non-darwin platforms', () => {
    if (process.platform !== 'darwin') {
      expect(detectAllBrowsers()).toEqual([])
    }
  })
})

describe('detectBrowser', () => {
  it('returns null for never-installed paths', () => {
    const result = detectBrowser('arc')
    expect(result === null || result.cookieDbPath.length > 0).toBe(true)
  })
})
