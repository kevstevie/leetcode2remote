import { describe, it, expect } from 'vitest'
import { homedir } from 'node:os'
import { formatExtractionFailure } from '../../../src/services/cookie/messages.js'
import { EXTRACTION_FAILURE_REASONS } from '../../../src/services/cookie/types.js'

describe('formatExtractionFailure keychain_denied', () => {
  it('uses generic message when no detail is provided', () => {
    const msg = formatExtractionFailure({
      ok: false,
      reason: 'keychain_denied',
      browser: 'chrome',
    })
    expect(msg).toContain('Keychain')
    expect(msg).toContain('chrome')
    expect(msg).not.toContain('Detail:')
  })

  it('maps known errSecUserCanceled detail to a canonical short hint', () => {
    const msg = formatExtractionFailure({
      ok: false,
      reason: 'keychain_denied',
      browser: 'chrome',
      detail: 'security: SecKeychainSearchCopyNext: User canceled the operation.',
    })
    expect(msg).toContain('canceled')
    expect(msg).not.toContain('SecKeychainSearchCopyNext')
  })

  it('maps known errSecInteractionNotAllowed detail to a canonical short hint', () => {
    const msg = formatExtractionFailure({
      ok: false,
      reason: 'keychain_denied',
      browser: 'chrome',
      detail: 'security: SecKeychainSearchCopyNext: User interaction is not allowed.',
    })
    expect(msg).toContain('interaction')
    expect(msg).not.toContain('SecKeychainSearchCopyNext')
  })

  it('drops unknown raw detail strings instead of echoing them', () => {
    const msg = formatExtractionFailure({
      ok: false,
      reason: 'keychain_denied',
      browser: 'chrome',
      detail: 'something unexpected with secret-looking text abc123xyz',
    })
    expect(msg).not.toContain('something unexpected')
    expect(msg).not.toContain('abc123xyz')
  })
})

describe('formatExtractionFailure coverage', () => {
  it.each(EXTRACTION_FAILURE_REASONS)('%s yields a specific message with a next step', (reason) => {
    const msg = formatExtractionFailure({ ok: false, reason })
    expect(msg).not.toContain('undefined')
    expect(msg).not.toMatch(/^Cookie extraction failed/)
    expect(msg.length).toBeGreaterThan(40)
  })

  it('gives every reason a distinct message', () => {
    const messages = EXTRACTION_FAILURE_REASONS.map((reason) =>
      formatExtractionFailure({ ok: false, reason })
    )
    expect(new Set(messages).size).toBe(messages.length)
  })

  it('tags the message with the browser when one is known', () => {
    const msg = formatExtractionFailure({ ok: false, reason: 'cookie_not_found', browser: 'arc' })
    expect(msg).toContain('arc')
  })

  it('offers the manual cookie fallback when decryption fails', () => {
    const msg = formatExtractionFailure({ ok: false, reason: 'decrypt_failed', browser: 'chrome' })
    expect(msg).toContain('leetcode.sessionCookie')
  })

  it('does not claim the cookie matches the failing one without evidence', () => {
    const msg = formatExtractionFailure({ ok: false, reason: 'invalid_cookie_format', browser: 'chrome' })
    expect(msg).not.toContain('matches the already-failing')
  })

  it('formats lock_timeout from the refresh path', () => {
    const msg = formatExtractionFailure({ ok: false, reason: 'lock_timeout' })
    expect(msg).toMatch(/another lcp process/i)
  })
})

describe('formatExtractionFailure attempts', () => {
  const keychain = { ok: false, reason: 'keychain_denied', browser: 'chrome' } as const
  const missing = { ok: false, reason: 'cookie_not_found', browser: 'arc' } as const

  it('lists every browser failure when several browsers were tried', () => {
    const msg = formatExtractionFailure({ ...missing, attempts: [keychain, missing] })
    expect(msg).toContain('any of 2 browsers')
    expect(msg).toContain('Keychain')
    expect(msg).toContain('chrome')
    expect(msg).toContain('LEETCODE_SESSION cookie not found')
    expect(msg).toContain('arc')
  })

  it('keeps each attempt detail attached to its own browser', () => {
    const unreadable = {
      ok: false,
      reason: 'cookie_db_unreadable',
      browser: 'chrome',
      detail: 'EACCES: permission denied',
    } as const
    const msg = formatExtractionFailure({ ...missing, attempts: [unreadable, missing] })
    expect(msg).toContain('Detail: EACCES: permission denied')
  })

  it('falls back to the single-failure format for one or zero attempts', () => {
    const single = formatExtractionFailure(missing)
    expect(formatExtractionFailure({ ...missing, attempts: [missing] })).toBe(single)
    expect(formatExtractionFailure({ ...missing, attempts: [] })).toBe(single)
  })
})

describe('formatExtractionFailure detail', () => {
  it.each([
    ['decrypt_failed', 'unsupported encryption version: v99'],
    ['cookie_db_unreadable', 'EACCES: permission denied'],
    ['browser_running', 'SQLITE_BUSY: database is locked'],
    ['invalid_cookie_format', 'browser cookie matches the already-failing one'],
  ] as const)('shows the underlying detail for %s', (reason, detail) => {
    const msg = formatExtractionFailure({ ok: false, reason, browser: 'chrome', detail })
    expect(msg).toContain(`Detail: ${detail}`)
  })

  it('omits the detail line when there is no detail', () => {
    const msg = formatExtractionFailure({ ok: false, reason: 'decrypt_failed', browser: 'chrome' })
    expect(msg).not.toContain('Detail:')
  })

  it('ignores detail for reasons whose remedy already says everything', () => {
    const msg = formatExtractionFailure({
      ok: false,
      reason: 'cookie_not_found',
      browser: 'chrome',
      detail: 'irrelevant internal text',
    })
    expect(msg).not.toContain('irrelevant internal text')
  })

  it('replaces the home directory with ~', () => {
    const msg = formatExtractionFailure({
      ok: false,
      reason: 'cookie_db_unreadable',
      detail: `EACCES: permission denied, copyfile '${homedir()}/Library/Cookies'`,
    })
    expect(msg).toContain("'~/Library/Cookies'")
    expect(msg).not.toContain(homedir())
  })

  it('redacts token-like values so a cookie can never leak through detail', () => {
    const session = 'eyJhbGciOiJIUzI1NiJ9.aaaaaaaaaaaaaaaaaaaa.bbbbbbb'
    const msg = formatExtractionFailure({
      ok: false,
      reason: 'decrypt_failed',
      detail: `bad value ${session} in row`,
    })
    expect(msg).not.toContain('eyJhbGci')
    expect(msg).toContain('[redacted]')
    expect(msg).toContain('in row')
  })

  it('keeps only the first line of a multi-line detail', () => {
    const msg = formatExtractionFailure({
      ok: false,
      reason: 'cookie_db_unreadable',
      detail: 'first line\nsecond line with more internals',
    })
    expect(msg).toContain('first line')
    expect(msg).not.toContain('second line')
  })

  it('truncates very long detail', () => {
    const msg = formatExtractionFailure({
      ok: false,
      reason: 'cookie_db_unreadable',
      detail: 'word '.repeat(200),
    })
    const detailLine = msg.split('\n').find((line) => line.includes('Detail:')) ?? ''
    expect(detailLine.length).toBeLessThanOrEqual(220)
    expect(detailLine.endsWith('…')).toBe(true)
  })
})
