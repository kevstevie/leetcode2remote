import { describe, it, expect } from 'vitest'
import { formatExtractionFailure } from '../../src/commands/cookie.js'

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
