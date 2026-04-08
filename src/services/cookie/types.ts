export type BrowserName = 'chrome' | 'firefox' | 'brave' | 'edge' | 'arc'

export interface DetectedBrowser {
  name: BrowserName
  cookiePath: string
  available?: boolean
}

export interface CookieExtractOptions {
  browser?: BrowserName
}
