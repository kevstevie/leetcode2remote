import { describe, it, expect, afterEach, vi } from 'vitest'
import { homedir } from 'os'
import { getRefreshLockPath } from '../../../src/services/cookie/lock.js'

describe('getRefreshLockPath', () => {
  const originalHome = process.env.HOME

  afterEach(() => {
    if (originalHome === undefined) {
      delete process.env.HOME
    } else {
      process.env.HOME = originalHome
    }
    vi.restoreAllMocks()
  })

  it('returns a path under the user home directory', () => {
    const lockPath = getRefreshLockPath()
    expect(lockPath.startsWith(homedir())).toBe(true)
    expect(lockPath).toContain('.leetcode-commit')
    expect(lockPath.endsWith('.refresh.lock')).toBe(true)
  })

  it('does not fall back to /tmp when HOME is unset', () => {
    delete process.env.HOME
    const lockPath = getRefreshLockPath()
    expect(lockPath.startsWith('/tmp')).toBe(false)
  })
})
