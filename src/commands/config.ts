import { loadConfig, saveConfig, getConfigPath } from '../config/loader.js'
import { logger } from '../utils/logger.js'
import { browserIdSchema, type Config } from '../config/schema.js'

type ConfigKey =
  | 'leetcode.sessionCookie'
  | 'leetcode.csrfToken'
  | 'leetcode.autoRefresh'
  | 'leetcode.interactiveRefresh'
  | 'leetcode.preferredBrowser'
  | 'github.repoPath'

const VALID_KEYS: readonly ConfigKey[] = [
  'leetcode.sessionCookie',
  'leetcode.csrfToken',
  'leetcode.autoRefresh',
  'leetcode.interactiveRefresh',
  'leetcode.preferredBrowser',
  'github.repoPath',
] as const

function assertKey(key: string): asserts key is ConfigKey {
  if (!(VALID_KEYS as readonly string[]).includes(key)) {
    logger.error(`Unknown config key: ${key}\nValid keys: ${VALID_KEYS.join(', ')}`)
    process.exit(1)
  }
}

function getNestedValue(obj: Config, key: ConfigKey): string | boolean | undefined {
  const [section, field] = key.split('.') as [keyof Config, string]
  const sectionObj = obj[section] as Record<string, string | boolean | undefined>
  return sectionObj[field]
}

function coerceValue(key: ConfigKey, value: string): string | boolean {
  if (key === 'leetcode.autoRefresh' || key === 'leetcode.interactiveRefresh') {
    if (value === 'true') return true
    if (value === 'false') return false
    logger.error(`${key} must be 'true' or 'false'`)
    process.exit(1)
  }
  if (key === 'leetcode.preferredBrowser') {
    const parsed = browserIdSchema.safeParse(value)
    if (!parsed.success) {
      logger.error(`${key} must be one of: chrome, firefox, edge, brave, arc`)
      process.exit(1)
    }
    return parsed.data
  }
  return value
}

function setNestedValue(obj: Config, key: ConfigKey, value: string | boolean): Config {
  const [section, field] = key.split('.') as [keyof Config, string]
  return {
    ...obj,
    [section]: {
      ...(obj[section] as Record<string, unknown>),
      [field]: value,
    },
  }
}

export function configGetCommand(key: string): void {
  assertKey(key)
  const config = loadConfig()
  const value = getNestedValue(config, key)
  if (value === undefined) {
    logger.error(`Key '${key}' not found`)
    process.exit(1)
  }
  console.log(String(value))
}

export function configSetCommand(key: string, rawValue: string): void {
  assertKey(key)
  const config = loadConfig()
  const value = coerceValue(key, rawValue)
  const updated = setNestedValue(config, key, value)
  saveConfig(updated)
  const display = key.includes('Cookie') ? '[redacted]' : String(value)
  logger.success(`Set ${key} = ${display}`)
}

export function configListCommand(): void {
  const config = loadConfig()
  const path = getConfigPath()
  console.log(`Config file: ${path}\n`)
  console.log(
    JSON.stringify(
      {
        ...config,
        leetcode: {
          ...config.leetcode,
          sessionCookie: config.leetcode.sessionCookie ? '[set]' : '[not set]',
        },
      },
      null,
      2
    )
  )
}
