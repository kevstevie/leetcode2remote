export type BrowserId = 'chrome' | 'firefox' | 'edge' | 'brave' | 'arc'

export const SUPPORTED_BROWSERS: readonly BrowserId[] = ['chrome', 'edge', 'brave', 'arc', 'firefox'] as const

export type ExtractionFailureReason =
  | 'unsupported_platform'
  | 'no_browser_detected'
  | 'browser_not_installed'
  | 'cookie_db_missing'
  | 'cookie_not_found'
  | 'browser_running'
  | 'keychain_denied'
  | 'decrypt_failed'
  | 'native_module_missing'
  | 'invalid_cookie_format'

export interface ExtractionSuccess {
  ok: true
  value: string
  browser: BrowserId
  expiresAt?: Date
}

export interface ExtractionFailure {
  ok: false
  reason: ExtractionFailureReason
  browser?: BrowserId
  detail?: string
}

export type ExtractionResult = ExtractionSuccess | ExtractionFailure

export interface DetectedBrowser {
  browser: BrowserId
  cookieDbPath: string
}

export interface ExtractOptions {
  browser?: BrowserId
  interactive: boolean
}

export interface BrowserExtractor {
  readonly id: BrowserId
  isInstalled(): boolean
  extract(): Promise<ExtractionResult>
}
