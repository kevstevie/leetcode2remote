import { buildOnAuthFailure, type AuthHandlerOptions } from '../services/cookie/auth-handler.js'
import type { Config } from '../config/schema.js'
import type { OnAuthFailure } from '../services/leetcode.js'

export interface AuthFlagOverrides {
  noAutoRefresh?: boolean
  noInteractiveRefresh?: boolean
  noOpenBrowser?: boolean
}

export function resolveAuthHandler(
  config: Config,
  overrides: AuthFlagOverrides = {}
): OnAuthFailure | undefined {
  const options = resolveAuthOptions(config, overrides)
  return buildOnAuthFailure(config, options)
}

export function resolveAuthOptions(
  config: Config,
  overrides: AuthFlagOverrides
): AuthHandlerOptions {
  const isTTY = Boolean(process.stdout.isTTY && process.stdin.isTTY)
  const autoRefreshDefault = config.leetcode.autoRefresh ?? true
  const interactiveDefault = config.leetcode.interactiveRefresh ?? isTTY
  return {
    autoRefresh: overrides.noAutoRefresh ? false : autoRefreshDefault,
    interactiveRefresh: overrides.noInteractiveRefresh ? false : interactiveDefault && isTTY,
    openBrowser: !overrides.noOpenBrowser,
    isTTY,
  }
}
