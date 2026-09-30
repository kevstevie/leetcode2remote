import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Config } from '../../../src/config/schema.js'

const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }))

vi.mock('../../../src/services/cookie/refresh.js', () => ({
  refreshSessionCookie: refreshMock,
}))

import { buildOnAuthFailure } from '../../../src/services/cookie/auth-handler.js'
import { logger } from '../../../src/utils/logger.js'

const config: Config = {
  leetcode: { sessionCookie: 'old-cookie', autoRefresh: true },
  github: { repoPath: '/tmp/fake-repo' },
}

const autoOnly = { autoRefresh: true, interactiveRefresh: false, openBrowser: false, isTTY: false }

describe('buildOnAuthFailure preferred browser fallback', () => {
  const withPreferred: Config = {
    ...config,
    leetcode: { ...config.leetcode, preferredBrowser: 'chrome' },
  }

  beforeEach(() => {
    refreshMock.mockReset()
    vi.restoreAllMocks()
  })

  it('logs why the preferred browser failed before trying the others', async () => {
    refreshMock
      .mockResolvedValueOnce({ ok: false, reason: 'keychain_denied', browser: 'chrome' })
      .mockResolvedValueOnce({ ok: true, newCookie: 'fresh-cookie', browser: 'firefox' })
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {})
    vi.spyOn(logger, 'info').mockImplementation(() => {})
    vi.spyOn(logger, 'success').mockImplementation(() => {})

    const handler = buildOnAuthFailure(withPreferred, autoOnly)
    await expect(handler?.('auto')).resolves.toBe('fresh-cookie')

    const output = warn.mock.calls.map(([msg]) => msg).join('\n')
    expect(output).toContain('Preferred browser (chrome)')
    expect(output).toContain('Keychain')
    expect(refreshMock).toHaveBeenNthCalledWith(1, withPreferred, expect.objectContaining({ browser: 'chrome' }))
    expect(refreshMock).toHaveBeenNthCalledWith(2, withPreferred, expect.not.objectContaining({ browser: 'chrome' }))
  })

  it('keeps the preferred browser reason visible when the other browsers fail too', async () => {
    refreshMock
      .mockResolvedValueOnce({ ok: false, reason: 'keychain_denied', browser: 'chrome' })
      .mockResolvedValueOnce({ ok: false, reason: 'cookie_not_found', browser: 'arc' })
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {})
    vi.spyOn(logger, 'info').mockImplementation(() => {})

    const handler = buildOnAuthFailure(withPreferred, autoOnly)
    await expect(handler?.('auto')).resolves.toBeNull()

    const output = warn.mock.calls.map(([msg]) => msg).join('\n')
    expect(output).toContain('Keychain')
    expect(output).toContain('LEETCODE_SESSION cookie not found')
  })

  it('does not run a second refresh when the preferred browser succeeds', async () => {
    refreshMock.mockResolvedValueOnce({ ok: true, newCookie: 'fresh-cookie', browser: 'chrome' })
    vi.spyOn(logger, 'warn').mockImplementation(() => {})
    vi.spyOn(logger, 'success').mockImplementation(() => {})

    const handler = buildOnAuthFailure(withPreferred, autoOnly)
    await expect(handler?.('auto')).resolves.toBe('fresh-cookie')
    expect(refreshMock).toHaveBeenCalledTimes(1)
  })
})

describe('buildOnAuthFailure auto stage', () => {
  beforeEach(() => {
    refreshMock.mockReset()
    vi.restoreAllMocks()
  })

  it('returns undefined when both refresh modes are disabled', () => {
    const handler = buildOnAuthFailure(config, { ...autoOnly, autoRefresh: false })
    expect(handler).toBeUndefined()
  })

  it('returns the fresh cookie when refresh succeeds', async () => {
    refreshMock.mockResolvedValue({ ok: true, newCookie: 'fresh-cookie', browser: 'chrome' })
    vi.spyOn(logger, 'warn').mockImplementation(() => {})
    vi.spyOn(logger, 'success').mockImplementation(() => {})

    const handler = buildOnAuthFailure(config, autoOnly)
    await expect(handler?.('auto')).resolves.toBe('fresh-cookie')
  })

  it('logs the failure reason together with its remedy when refresh fails', async () => {
    refreshMock.mockResolvedValue({ ok: false, reason: 'native_module_missing' })
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {})

    const handler = buildOnAuthFailure(config, autoOnly)
    await expect(handler?.('auto')).resolves.toBeNull()

    const output = warn.mock.calls.map(([msg]) => msg).join('\n')
    expect(output).toContain('npm rebuild better-sqlite3')
  })

  it('logs the underlying detail so the user can see why extraction failed', async () => {
    refreshMock.mockResolvedValue({
      ok: false,
      reason: 'cookie_db_unreadable',
      browser: 'chrome',
      detail: 'EACCES: permission denied',
    })
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {})

    const handler = buildOnAuthFailure(config, autoOnly)
    await handler?.('auto')

    const output = warn.mock.calls.map(([msg]) => msg).join('\n')
    expect(output).toContain('EACCES: permission denied')
  })

  it('logs every browser failure, not just the last one', async () => {
    refreshMock.mockResolvedValue({
      ok: false,
      reason: 'cookie_not_found',
      browser: 'arc',
      attempts: [
        { ok: false, reason: 'keychain_denied', browser: 'chrome' },
        { ok: false, reason: 'cookie_not_found', browser: 'arc' },
      ],
    })
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {})

    const handler = buildOnAuthFailure(config, autoOnly)
    await handler?.('auto')

    const output = warn.mock.calls.map(([msg]) => msg).join('\n')
    expect(output).toContain('Keychain')
    expect(output).toContain('chrome')
    expect(output).toContain('arc')
  })

  it('logs a remedy for reasons the short refresh table used to omit', async () => {
    refreshMock.mockResolvedValue({ ok: false, reason: 'decrypt_failed', browser: 'chrome' })
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {})

    const handler = buildOnAuthFailure(config, autoOnly)
    await handler?.('auto')

    const output = warn.mock.calls.map(([msg]) => msg).join('\n')
    expect(output).toContain('leetcode.sessionCookie')
  })
})
