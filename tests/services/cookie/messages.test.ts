import { describe, it, expect } from 'vitest'
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
