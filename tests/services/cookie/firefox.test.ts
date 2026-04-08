import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractFirefoxCookie } from '../../../src/services/cookie/firefox.js'

vi.mock('better-sqlite3', () => {
  return {
    default: vi.fn(),
  }
})

import Database from 'better-sqlite3'

describe('extractFirefoxCookie', () => {
  beforeEach(() => {
    vi.mocked(Database).mockReset()
  })

  it('returns cookie value when found', () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        get: vi.fn().mockReturnValue({ value: 'firefox-session-token' }),
      }),
      close: vi.fn(),
    }
    vi.mocked(Database).mockReturnValue(mockDb as never)

    const result = extractFirefoxCookie('/fake/path/cookies.sqlite')
    expect(result).toBe('firefox-session-token')
  })

  it('throws when LEETCODE_SESSION cookie not found', () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        get: vi.fn().mockReturnValue(null),
      }),
      close: vi.fn(),
    }
    vi.mocked(Database).mockReturnValue(mockDb as never)

    expect(() => extractFirefoxCookie('/fake/path/cookies.sqlite')).toThrow(
      'LEETCODE_SESSION cookie not found'
    )
  })

  it('closes database even on error', () => {
    const mockClose = vi.fn()
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        get: vi.fn().mockReturnValue(null),
      }),
      close: mockClose,
    }
    vi.mocked(Database).mockReturnValue(mockDb as never)

    expect(() => extractFirefoxCookie('/fake/path/cookies.sqlite')).toThrow()
    expect(mockClose).toHaveBeenCalledOnce()
  })
})
