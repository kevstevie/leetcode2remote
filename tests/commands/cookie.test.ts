import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cookieCommand, cookieListCommand } from '../../src/commands/cookie.js'

vi.mock('../../src/services/cookie/index.js', () => ({
  extractLeetCodeSession: vi.fn(),
  listDetectedBrowsers: vi.fn(),
}))

vi.mock('../../src/config/loader.js', () => ({
  saveConfig: vi.fn(),
  loadConfig: vi.fn(),
}))

import { extractLeetCodeSession, listDetectedBrowsers } from '../../src/services/cookie/index.js'
import { saveConfig, loadConfig } from '../../src/config/loader.js'

describe('cookieCommand', () => {
  beforeEach(() => {
    vi.mocked(extractLeetCodeSession).mockReset()
    vi.mocked(saveConfig).mockReset()
    vi.mocked(loadConfig).mockReset()
  })

  it('extracts cookie and saves to config', async () => {
    vi.mocked(extractLeetCodeSession).mockReturnValue('extracted-session-token')
    vi.mocked(loadConfig).mockReturnValue({
      leetcode: { sessionCookie: 'old-token' },
      github: { repoPath: '/repo' },
    })

    await cookieCommand({ browser: undefined })

    expect(extractLeetCodeSession).toHaveBeenCalledWith({ browser: undefined })
    expect(saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        leetcode: expect.objectContaining({ sessionCookie: 'extracted-session-token' }),
      })
    )
  })

  it('uses specified browser', async () => {
    vi.mocked(extractLeetCodeSession).mockReturnValue('chrome-session')
    vi.mocked(loadConfig).mockReturnValue({
      leetcode: { sessionCookie: 'old' },
      github: { repoPath: '/repo' },
    })

    await cookieCommand({ browser: 'chrome' })

    expect(extractLeetCodeSession).toHaveBeenCalledWith({ browser: 'chrome' })
  })

  it('creates new config when none exists', async () => {
    vi.mocked(extractLeetCodeSession).mockReturnValue('new-session')
    vi.mocked(loadConfig).mockImplementation(() => {
      throw new Error('Config file not found')
    })

    await cookieCommand({ browser: undefined })

    expect(saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        leetcode: { sessionCookie: 'new-session' },
      })
    )
  })

  it('throws when extraction fails', async () => {
    vi.mocked(extractLeetCodeSession).mockImplementation(() => {
      throw new Error('Keychain access denied')
    })

    await expect(cookieCommand({ browser: undefined })).rejects.toThrow('Keychain access denied')
  })
})

describe('cookieListCommand', () => {
  beforeEach(() => {
    vi.mocked(listDetectedBrowsers).mockReset()
  })

  it('calls listDetectedBrowsers', () => {
    vi.mocked(listDetectedBrowsers).mockReturnValue([
      { name: 'chrome', cookiePath: '/path/Cookies' },
    ])

    cookieListCommand()

    expect(listDetectedBrowsers).toHaveBeenCalled()
  })
})
