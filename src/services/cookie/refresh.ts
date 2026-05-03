import { loadConfig as defaultLoadConfig, saveConfig as defaultSaveConfig } from '../../config/loader.js'
import { extractLeetCodeSession as defaultExtract } from './index.js'
import { acquireLock as defaultAcquireLock, getRefreshLockPath } from './lock.js'
import type { BrowserId, ExtractionFailureReason, ExtractionResult } from './types.js'
import type { Config } from '../../config/schema.js'

export interface RefreshOptions {
  browser?: BrowserId
  interactive?: boolean
}

export type RefreshResult =
  | { ok: true; newCookie: string; browser: BrowserId; expiresAt?: Date }
  | { ok: false; reason: ExtractionFailureReason | 'lock_timeout'; browser?: BrowserId; detail?: string }

export interface RefreshDeps {
  loadConfig?: () => Config
  saveConfig?: (config: Config) => void
  extract?: (opts: { browser?: BrowserId; interactive: boolean }) => Promise<ExtractionResult>
  acquireLock?: (
    path: string,
    opts?: { timeoutMs?: number }
  ) => Promise<{ release: () => void } | null>
}

export async function refreshSessionCookie(
  currentConfig: Config,
  opts: RefreshOptions = {},
  deps: RefreshDeps = {}
): Promise<RefreshResult> {
  const acquireLock = deps.acquireLock ?? defaultAcquireLock
  const loadConfig = deps.loadConfig ?? defaultLoadConfig
  const saveConfig = deps.saveConfig ?? defaultSaveConfig
  const extract = deps.extract ?? defaultExtract

  const lock = await acquireLock(getRefreshLockPath(), { timeoutMs: 5000 })
  if (!lock) {
    return { ok: false, reason: 'lock_timeout' }
  }

  try {
    const fresh = safeLoad(loadConfig) ?? currentConfig
    if (fresh.leetcode.sessionCookie !== currentConfig.leetcode.sessionCookie) {
      return {
        ok: true,
        newCookie: fresh.leetcode.sessionCookie,
        browser: opts.browser ?? 'chrome',
      }
    }

    const result = await extract({
      browser: opts.browser ?? fresh.leetcode.preferredBrowser,
      interactive: opts.interactive ?? false,
    })

    if (!result.ok) {
      return { ok: false, reason: result.reason, browser: result.browser, detail: result.detail }
    }

    if (result.value === currentConfig.leetcode.sessionCookie) {
      return {
        ok: false,
        reason: 'invalid_cookie_format',
        browser: result.browser,
        detail: 'browser cookie matches the already-failing one',
      }
    }

    saveConfig({
      ...fresh,
      leetcode: {
        ...fresh.leetcode,
        sessionCookie: result.value,
      },
    })

    return {
      ok: true,
      newCookie: result.value,
      browser: result.browser,
      expiresAt: result.expiresAt,
    }
  } finally {
    lock.release()
  }
}

function safeLoad(loader: () => Config): Config | null {
  try {
    return loader()
  } catch {
    return null
  }
}
