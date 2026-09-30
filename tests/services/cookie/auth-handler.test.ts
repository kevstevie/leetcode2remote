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

  it('logs a remedy for reasons the short refresh table used to omit', async () => {
    refreshMock.mockResolvedValue({ ok: false, reason: 'decrypt_failed', browser: 'chrome' })
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {})

    const handler = buildOnAuthFailure(config, autoOnly)
    await handler?.('auto')

    const output = warn.mock.calls.map(([msg]) => msg).join('\n')
    expect(output).toContain('leetcode.sessionCookie')
  })
})
