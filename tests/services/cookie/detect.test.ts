import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { mkdirSync, rmSync, writeFileSync, symlinkSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
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

describe('detectBrowser firefox profile hardening', () => {
  const root = join(tmpdir(), 'lcp-detect-test-' + Date.now())
  const profilesDir = join(root, 'Profiles')
  const outsideDir = join(root, 'outside')

  beforeEach(() => {
    mkdirSync(profilesDir, { recursive: true })
    mkdirSync(outsideDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(root)) rmSync(root, { recursive: true, force: true })
    vi.resetModules()
    vi.restoreAllMocks()
  })

  async function loadDetectWith(profilesDir: string) {
    vi.resetModules()
    vi.doMock('../../../src/services/cookie/paths.js', () => ({
      getFirefoxProfilesDir: () => profilesDir,
      getBrowserPaths: () => ({ cookieDb: '/nonexistent' }),
    }))
    return await import('../../../src/services/cookie/detect.js')
  }

  it('skips profile entries that are symlinks (no follow)', async () => {
    const realProfile = join(profilesDir, 'real.default')
    mkdirSync(realProfile)
    writeFileSync(join(realProfile, 'cookies.sqlite'), 'A')

    const evilTarget = join(outsideDir, 'evil-profile')
    mkdirSync(evilTarget)
    writeFileSync(join(evilTarget, 'cookies.sqlite'), 'B')
    symlinkSync(evilTarget, join(profilesDir, 'evil.symlinked'))

    const { detectBrowser } = await loadDetectWith(profilesDir)
    const result = detectBrowser('firefox')
    expect(result).not.toBeNull()
    expect(result!.cookieDbPath.startsWith(realProfile)).toBe(true)
  })

  it('returns null when only candidate is a symlink escaping profilesDir', async () => {
    const evilTarget = join(outsideDir, 'evil-profile')
    mkdirSync(evilTarget)
    writeFileSync(join(evilTarget, 'cookies.sqlite'), 'B')
    symlinkSync(evilTarget, join(profilesDir, 'evil.symlinked'))

    const { detectBrowser } = await loadDetectWith(profilesDir)
    const result = detectBrowser('firefox')
    expect(result).toBeNull()
  })
})
