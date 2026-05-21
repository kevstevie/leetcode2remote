import { detectAllBrowsers, detectBrowser, isPlatformSupported } from './detect.js'
import { extractChromiumCookie } from './chrome.js'
import { extractFirefoxCookie } from './firefox.js'
import type { BrowserId, ExtractOptions, ExtractionResult } from './types.js'

export type { BrowserId, ExtractionResult, ExtractionFailureReason, DetectedBrowser } from './types.js'
export { detectAllBrowsers, detectBrowser, isPlatformSupported } from './detect.js'

export async function extractLeetCodeSession(
  opts: ExtractOptions
): Promise<ExtractionResult> {
  if (!isPlatformSupported()) {
    return { ok: false, reason: 'unsupported_platform' }
  }

  if (opts.browser) {
    const detected = detectBrowser(opts.browser)
    if (!detected) {
      return { ok: false, reason: 'browser_not_installed', browser: opts.browser }
    }
    return extractAndValidate(opts.browser, opts.excludeValue)
  }

  const detected = detectAllBrowsers()
  if (detected.length === 0) {
    return { ok: false, reason: 'no_browser_detected' }
  }

  let lastFailure: ExtractionResult | null = null
  for (const { browser } of detected) {
    const result = await extractAndValidate(browser, opts.excludeValue)
    if (result.ok) return result
    lastFailure = result
  }
  return lastFailure ?? { ok: false, reason: 'no_browser_detected' }
}

async function extractAndValidate(
  browser: BrowserId,
  excludeValue: string | undefined
): Promise<ExtractionResult> {
  const result = await extractFor(browser)
  if (!result.ok) return result
  if (excludeValue && result.value === excludeValue) {
    return {
      ok: false,
      reason: 'invalid_cookie_format',
      browser,
      detail: 'browser cookie matches the already-failing one',
    }
  }
  return result
}

async function extractFor(browser: BrowserId): Promise<ExtractionResult> {
  if (browser === 'firefox') return extractFirefoxCookie()
  return extractChromiumCookie(browser)
}
