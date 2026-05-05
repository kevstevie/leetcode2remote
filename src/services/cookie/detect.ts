import { existsSync, lstatSync, readdirSync, realpathSync, statSync } from 'fs'
import { join, resolve, sep } from 'path'
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
  let resolvedRoot: string
  try {
    resolvedRoot = realpathSync(profilesDir)
  } catch {
    return null
  }
  let entries: string[]
  try {
    entries = readdirSync(profilesDir)
  } catch {
    return null
  }
  const candidates = entries
    .filter((name) => isRealDirectory(join(profilesDir, name)))
    .map((name) => join(profilesDir, name, 'cookies.sqlite'))
    .filter((path) => isContainedRegularFile(path, resolvedRoot))
    .map((path) => ({ path, mtime: safeMtime(path) }))
    .sort((a, b) => b.mtime - a.mtime)
  return candidates[0]?.path ?? null
}

function isRealDirectory(path: string): boolean {
  try {
    const st = lstatSync(path)
    return st.isDirectory()
  } catch {
    return false
  }
}

function isContainedRegularFile(filePath: string, resolvedRoot: string): boolean {
  try {
    const linkStat = lstatSync(filePath)
    if (!linkStat.isFile()) return false
    const real = realpathSync(filePath)
    const rootWithSep = resolvedRoot.endsWith(sep) ? resolvedRoot : resolvedRoot + sep
    return resolve(real).startsWith(rootWithSep)
  } catch {
    return false
  }
}

function safeMtime(path: string): number {
  try {
    return statSync(path).mtimeMs
  } catch {
    return 0
  }
}
