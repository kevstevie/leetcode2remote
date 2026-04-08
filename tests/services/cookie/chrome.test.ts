import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractChromeCookie } from '../../../src/services/cookie/chrome.js'

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}))

vi.mock('better-sqlite3', () => {
  return {
    default: vi.fn(),
  }
})

vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>()
  return {
    ...actual,
    pbkdf2Sync: vi.fn(),
    createDecipheriv: vi.fn(),
  }
})

import { execSync } from 'child_process'
import Database from 'better-sqlite3'
import { pbkdf2Sync, createDecipheriv } from 'crypto'

describe('extractChromeCookie', () => {
  beforeEach(() => {
    vi.mocked(execSync).mockReset()
    vi.mocked(Database).mockReset()
    vi.mocked(pbkdf2Sync).mockReset()
    vi.mocked(createDecipheriv).mockReset()
  })

  it('returns plaintext cookie when encrypted_value is empty', () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        get: vi.fn().mockReturnValue({
          value: 'plain-session-value',
          encrypted_value: Buffer.alloc(0),
        }),
      }),
      close: vi.fn(),
    }
    vi.mocked(Database).mockReturnValue(mockDb as never)
    vi.mocked(execSync).mockReturnValue(Buffer.from('dummy-password\n'))

    const result = extractChromeCookie('/fake/path/Cookies')
    expect(result).toBe('plain-session-value')
  })

  it('throws when LEETCODE_SESSION cookie not found', () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        get: vi.fn().mockReturnValue(null),
      }),
      close: vi.fn(),
    }
    vi.mocked(Database).mockReturnValue(mockDb as never)
    vi.mocked(execSync).mockReturnValue(Buffer.from('dummy-password\n'))

    expect(() => extractChromeCookie('/fake/path/Cookies')).toThrow(
      'LEETCODE_SESSION cookie not found'
    )
  })

  it('throws when keychain access fails', () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        get: vi.fn().mockReturnValue(null),
      }),
      close: vi.fn(),
    }
    vi.mocked(Database).mockReturnValue(mockDb as never)
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('security: SecKeychainSearchCopyNext: The specified item could not be found')
    })

    expect(() => extractChromeCookie('/fake/path/Cookies')).toThrow()
  })

  it('decrypts v10 encrypted cookie', () => {
    const fakeDeciphered = Buffer.from('decrypted-session-token')
    const mockFinal = vi.fn().mockReturnValue(fakeDeciphered)
    const mockUpdate = vi.fn().mockReturnValue(Buffer.alloc(0))
    const mockDecipher = {
      update: mockUpdate,
      final: mockFinal,
      setAutoPadding: vi.fn(),
    }
    vi.mocked(createDecipheriv).mockReturnValue(mockDecipher as never)

    const derivedKey = Buffer.alloc(16)
    vi.mocked(pbkdf2Sync).mockReturnValue(derivedKey)

    // encrypted_value: 'v10' prefix + 16 bytes payload
    const encryptedValue = Buffer.concat([Buffer.from('v10'), Buffer.alloc(16)])
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        get: vi.fn().mockReturnValue({
          value: '',
          encrypted_value: encryptedValue,
        }),
      }),
      close: vi.fn(),
    }
    vi.mocked(Database).mockReturnValue(mockDb as never)
    vi.mocked(execSync).mockReturnValue(Buffer.from('my-password\n'))

    const result = extractChromeCookie('/fake/path/Cookies')
    expect(result).toBe('decrypted-session-token')
    expect(pbkdf2Sync).toHaveBeenCalledWith('my-password', 'saltysalt', 1003, 16, 'sha1')
    expect(createDecipheriv).toHaveBeenCalledWith('aes-128-cbc', derivedKey, Buffer.alloc(16, 0x20))
  })
})
