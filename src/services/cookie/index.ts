import { detectBrowsers, getBrowserCookiePath } from './detect.js'
import { extractChromeCookie } from './chrome.js'
import { extractFirefoxCookie } from './firefox.js'
import type { BrowserName, CookieExtractOptions, DetectedBrowser } from './types.js'

function extractFromBrowser(name: BrowserName, cookiePath: string): string {
  if (name === 'firefox') {
    return extractFirefoxCookie(cookiePath)
  }
  const serviceName = name === 'brave' ? 'Brave Safe Storage' : 'Chrome Safe Storage'
  return extractChromeCookie(cookiePath, serviceName)
}

export function extractLeetCodeSession(options: CookieExtractOptions): string {
  if (options.browser) {
    const cookiePath = getBrowserCookiePath(options.browser)
    return extractFromBrowser(options.browser, cookiePath)
  }

  const detected = detectBrowsers()
  if (detected.length === 0) {
    throw new Error('No supported browsers detected on this system')
  }

  const errors: string[] = []
  for (const browser of detected) {
    try {
      return extractFromBrowser(browser.name, browser.cookiePath)
    } catch (err) {
      errors.push(`${browser.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  throw new Error(`Failed to extract cookie from any browser:\n${errors.join('\n')}`)
}

export function listDetectedBrowsers(): (DetectedBrowser & { available: boolean })[] {
  return detectBrowsers().map((b) => ({ ...b, available: true }))
}

export type { BrowserName, CookieExtractOptions, DetectedBrowser }
