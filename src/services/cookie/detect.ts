import { existsSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { getBrowserPaths, getFirefoxProfilesDir } from './paths.js'
import { SUPPORTED_BROWSERS, type BrowserId, type DetectedBrowser } from './types.js'

export function isPlatformSupported(): boolean {
  return process.platform === 'darwin'
}

export function detectBrowser(browser: BrowserId): DetectedBrowser | null {
  if (browser === 'firefox') {
    const dbPath = findFirefoxCookieDb()
    if (!dbPath) return null
    return { browser, cookieDbPath: dbPath }
  }
  const { cookieDb } = getBrowserPaths(browser)
  if (!existsSync(cookieDb)) return null
  return { browser, cookieDbPath: cookieDb }
}

export function detectAllBrowsers(): DetectedBrowser[] {
  if (!isPlatformSupported()) return []
  return SUPPORTED_BROWSERS.map((b) => detectBrowser(b)).filter(
    (x): x is DetectedBrowser => x !== null
  )
}

function findFirefoxCookieDb(): string | null {
  const profilesDir = getFirefoxProfilesDir()
  if (!existsSync(profilesDir)) return null
  let entries: string[]
  try {
    entries = readdirSync(profilesDir)
  } catch {
    return null
  }
  const candidates = entries
    .map((name) => join(profilesDir, name, 'cookies.sqlite'))
    .filter((path) => existsSync(path))
    .map((path) => ({ path, mtime: safeMtime(path) }))
    .sort((a, b) => b.mtime - a.mtime)
  return candidates[0]?.path ?? null
}

function safeMtime(path: string): number {
  try {
    return statSync(path).mtimeMs
  } catch {
    return 0
  }
}
