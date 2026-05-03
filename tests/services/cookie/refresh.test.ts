import { describe, it, expect, vi, beforeEach } from 'vitest'
import { refreshSessionCookie } from '../../../src/services/cookie/refresh.js'
import type { Config } from '../../../src/config/schema.js'
import type { ExtractionResult } from '../../../src/services/cookie/types.js'

const baseConfig: Config = {
  leetcode: {
    sessionCookie: 'old-cookie',
    autoRefresh: true,
  },
  github: {
    repoPath: '/tmp/fake-repo',
  },
}

function makeDeps(overrides: {
  loadResult?: Config | 'throw'
  extractResult?: ExtractionResult
  lockResult?: { release: () => void } | null
}) {
  const saveSpy = vi.fn()
  const releaseSpy = vi.fn()
  return {
    saveSpy,
    releaseSpy,
    deps: {
      loadConfig: () => {
        if (overrides.loadResult === 'throw') throw new Error('no config')
        return overrides.loadResult ?? baseConfig
      },
      saveConfig: saveSpy,
      extract: vi.fn().mockResolvedValue(
        overrides.extractResult ?? { ok: false, reason: 'cookie_not_found' as const }
      ),
      acquireLock: vi.fn().mockResolvedValue(
        overrides.lockResult === null
          ? null
          : overrides.lockResult ?? { release: releaseSpy }
      ),
    },
  }
}

describe('refreshSessionCookie', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('persists fresh cookie when extraction succeeds', async () => {
    const { saveSpy, deps } = makeDeps({
      extractResult: { ok: true, value: 'fresh-cookie-aaaaaaaaaaaaaaaa', browser: 'chrome' },
    })

    const result = await refreshSessionCookie(baseConfig, {}, deps)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.newCookie).toBe('fresh-cookie-aaaaaaaaaaaaaaaa')
      expect(result.browser).toBe('chrome')
    }
    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        leetcode: expect.objectContaining({
          sessionCookie: 'fresh-cookie-aaaaaaaaaaaaaaaa',
        }),
      })
    )
  })

  it('does not call saveConfig when extraction fails', async () => {
    const { saveSpy, deps } = makeDeps({
      extractResult: { ok: false, reason: 'cookie_not_found', browser: 'chrome' },
    })

    const result = await refreshSessionCookie(baseConfig, {}, deps)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('cookie_not_found')
    expect(saveSpy).not.toHaveBeenCalled()
  })

  it('returns invalid_cookie_format when extracted value matches the failing one', async () => {
    const { saveSpy, deps } = makeDeps({
      extractResult: { ok: true, value: 'old-cookie', browser: 'chrome' },
    })

    const result = await refreshSessionCookie(baseConfig, {}, deps)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('invalid_cookie_format')
    expect(saveSpy).not.toHaveBeenCalled()
  })

  it('returns lock_timeout when lock cannot be acquired', async () => {
    const { deps } = makeDeps({ lockResult: null })
    const result = await refreshSessionCookie(baseConfig, {}, deps)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('lock_timeout')
  })

  it('uses preferredBrowser from current config when not overridden', async () => {
    const { deps } = makeDeps({
      extractResult: { ok: true, value: 'fresh-cookie-aaaaaaaaaaaaaaaa', browser: 'firefox' },
      loadResult: {
        ...baseConfig,
        leetcode: { ...baseConfig.leetcode, preferredBrowser: 'firefox' },
      },
    })
    await refreshSessionCookie(
      { ...baseConfig, leetcode: { ...baseConfig.leetcode, preferredBrowser: 'firefox' } },
      {},
      deps
    )
    expect(deps.extract).toHaveBeenCalledWith(
      expect.objectContaining({ browser: 'firefox', interactive: false })
    )
  })

  it('detects out-of-band refresh and uses fresh cookie from disk', async () => {
    const updatedConfig: Config = {
      ...baseConfig,
      leetcode: { ...baseConfig.leetcode, sessionCookie: 'cookie-written-by-other-process' },
    }
    const { saveSpy, deps } = makeDeps({
      loadResult: updatedConfig,
      extractResult: { ok: false, reason: 'cookie_not_found' },
    })

    const result = await refreshSessionCookie(baseConfig, {}, deps)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.newCookie).toBe('cookie-written-by-other-process')
    expect(deps.extract).not.toHaveBeenCalled()
    expect(saveSpy).not.toHaveBeenCalled()
  })

  it('always releases the lock', async () => {
    const { releaseSpy, deps } = makeDeps({
      extractResult: { ok: false, reason: 'browser_running', browser: 'chrome' },
    })
    await refreshSessionCookie(baseConfig, {}, deps)
    expect(releaseSpy).toHaveBeenCalled()
  })
})
