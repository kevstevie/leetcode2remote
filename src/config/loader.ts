import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { CONFIG_DIR, CONFIG_FILE } from './constants.js'
import { configSchema, type Config } from './schema.js'

export function loadConfig(): Config {
  if (!existsSync(CONFIG_FILE)) {
    throw new Error(
      `Config file not found. Run 'leetcode-commit init' to create it.\n` +
        `Expected location: ${CONFIG_FILE}`
    )
  }

  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'))
  } catch {
    throw new Error(`Failed to parse config file at ${CONFIG_FILE}. Ensure it is valid JSON.`)
  }

  const result = configSchema.safeParse(raw)
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Invalid config:\n${issues}`)
  }

  return result.data
}

export function saveConfig(config: Config): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true })
  }
  const result = configSchema.safeParse(config)
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Invalid config:\n${issues}`)
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
}

export function configExists(): boolean {
  return existsSync(CONFIG_FILE)
}

export function getConfigPath(): string {
  return CONFIG_FILE
}
