import { describe, it, expect } from 'vitest'
import { isNativeBindingError } from '../../../src/services/cookie/sqlite.js'

describe('isNativeBindingError', () => {
  it('detects an ABI version mismatch thrown when the .node file is dlopen-ed', () => {
    const err = Object.assign(
      new Error(
        "The module '/x/better_sqlite3.node'\nwas compiled against a different Node.js version using\nNODE_MODULE_VERSION 127. This version of Node.js requires\nNODE_MODULE_VERSION 137."
      ),
      { code: 'ERR_DLOPEN_FAILED' }
    )
    expect(isNativeBindingError(err)).toBe(true)
  })

  it('detects a missing bindings file', () => {
    expect(
      isNativeBindingError(new Error('Could not locate the bindings file. Tried: ...'))
    ).toBe(true)
  })

  it('detects an architecture mismatch', () => {
    expect(
      isNativeBindingError(
        Object.assign(new Error('mach-o file, but is an incompatible architecture'), {
          code: 'ERR_DLOPEN_FAILED',
        })
      )
    ).toBe(true)
  })

  it('does not treat a locked database as a native binding error', () => {
    expect(isNativeBindingError(new Error('SQLITE_BUSY: database is locked'))).toBe(false)
  })

  it('does not treat a missing file as a native binding error', () => {
    expect(isNativeBindingError(new Error('ENOENT: no such file or directory'))).toBe(false)
  })

  it('handles non-Error throwables', () => {
    expect(isNativeBindingError('boom')).toBe(false)
    expect(isNativeBindingError(null)).toBe(false)
  })
})
