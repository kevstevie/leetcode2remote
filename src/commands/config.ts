import { loadConfig, saveConfig, getConfigPath } from '../config/loader.js'
import { logger } from '../utils/logger.js'
import type { Config } from '../config/schema.js'

type ConfigKey = 'leetcode.sessionCookie' | 'leetcode.csrfToken' | 'github.repoPath'

function getNestedValue(obj: Config, key: ConfigKey): string | undefined {
  const [section, field] = key.split('.') as [keyof Config, string]
  const sectionObj = obj[section] as Record<string, string | undefined>
  return sectionObj[field]
}

function setNestedValue(obj: Config, key: ConfigKey, value: string): Config {
  const [section, field] = key.split('.') as [keyof Config, string]
  return {
    ...obj,
    [section]: {
      ...(obj[section] as Record<string, unknown>),
      [field]: value,
    },
  }
}

export function configGetCommand(key: ConfigKey): void {
  const config = loadConfig()
  const value = getNestedValue(config, key)
  if (value === undefined) {
    logger.error(`Key '${key}' not found`)
    process.exit(1)
  }
  console.log(value)
}

export function configSetCommand(key: ConfigKey, value: string): void {
  const config = loadConfig()
  const updated = setNestedValue(config, key, value)
  saveConfig(updated)
  logger.success(`Set ${key} = ${key.includes('Cookie') ? '[redacted]' : value}`)
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
