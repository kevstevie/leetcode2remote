import { homedir } from 'os'
import { join } from 'path'
import type { BrowserId } from './types.js'

export interface BrowserPaths {
  cookieDb: string
  keychainServiceName?: string
}

const HOME = homedir()

const CHROMIUM_FAMILY: Record<Exclude<BrowserId, 'firefox'>, BrowserPaths> = {
  chrome: {
    cookieDb: join(HOME, 'Library', 'Application Support', 'Google', 'Chrome', 'Default', 'Cookies'),
    keychainServiceName: 'Chrome Safe Storage',
  },
  edge: {
    cookieDb: join(HOME, 'Library', 'Application Support', 'Microsoft Edge', 'Default', 'Cookies'),
    keychainServiceName: 'Microsoft Edge Safe Storage',
  },
  brave: {
    cookieDb: join(
      HOME,
      'Library',
      'Application Support',
      'BraveSoftware',
      'Brave-Browser',
      'Default',
      'Cookies'
    ),
    keychainServiceName: 'Brave Safe Storage',
  },
  arc: {
    cookieDb: join(HOME, 'Library', 'Application Support', 'Arc', 'User Data', 'Default', 'Cookies'),
    keychainServiceName: 'Arc Safe Storage',
  },
}

export function getBrowserPaths(browser: BrowserId): BrowserPaths {
  if (browser === 'firefox') {
    return { cookieDb: getFirefoxCookieDb() }
  }
  return CHROMIUM_FAMILY[browser]
}

export function getFirefoxProfilesDir(): string {
  return join(HOME, 'Library', 'Application Support', 'Firefox', 'Profiles')
}

function getFirefoxCookieDb(): string {
  return join(getFirefoxProfilesDir(), 'cookies.sqlite')
}
