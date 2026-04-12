import { existsSync, readdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import type { BrowserName, DetectedBrowser } from './types.js'

const CHROME_COOKIE_PATHS: Record<BrowserName, string> = {
  chrome: join(homedir(), 'Library/Application Support/Google/Chrome/Default/Cookies'),
  brave: join(homedir(), 'Library/Application Support/BraveSoftware/Brave-Browser/Default/Cookies'),
  edge: join(homedir(), 'Library/Application Support/Microsoft Edge/Default/Cookies'),
  arc: join(homedir(), 'Library/Application Support/Arc/User Data/Default/Cookies'),
  firefox: '',
}

function getFirefoxCookiePath(): string {
  const firefoxProfilesDir = join(homedir(), 'Library/Application Support/Firefox/Profiles')
  try {
    const profiles = readdirSync(firefoxProfilesDir)
    const defaultRelease = profiles.find((p) => p.endsWith('.default-release'))
    const profile = defaultRelease ?? profiles[0]
    if (!profile) return ''
    return join(firefoxProfilesDir, profile, 'cookies.sqlite')
  } catch {
    return ''
  }
}

export function getBrowserCookiePath(browser: BrowserName): string {
  if (browser === 'firefox') {
    return getFirefoxCookiePath()
  }
  if (!(browser in CHROME_COOKIE_PATHS)) {
    throw new Error(`Unsupported browser: ${browser}`)
  }
  return CHROME_COOKIE_PATHS[browser]
}

export function detectBrowsers(): DetectedBrowser[] {
  const result: DetectedBrowser[] = []

  const chromiumBrowsers: BrowserName[] = ['chrome', 'brave', 'edge', 'arc']
  for (const name of chromiumBrowsers) {
    const cookiePath = CHROME_COOKIE_PATHS[name]
    if (existsSync(cookiePath)) {
      result.push({ name, cookiePath })
    }
  }

  const firefoxPath = getFirefoxCookiePath()
  if (firefoxPath && existsSync(firefoxPath)) {
    result.push({ name: 'firefox', cookiePath: firefoxPath })
  }

  return result
}
