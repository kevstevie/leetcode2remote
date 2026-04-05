import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// Use temp dir for config during tests
const testDir = join(tmpdir(), 'leetcode-commit-test-' + Date.now())

vi.mock('../../src/config/constants.js', () => ({
  CONFIG_DIR: testDir,
  CONFIG_FILE: join(testDir, 'config.json'),
  LEETCODE_GRAPHQL_URL: 'https://leetcode.com/graphql',
  LEETCODE_BASE_URL: 'https://leetcode.com',
  ACCEPTED_STATUS: 10,
}))

describe('config loader', () => {
  beforeEach(() => {
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true })
    }
    vi.resetModules()
  })

  it('throws when config file does not exist', async () => {
    const { loadConfig } = await import('../../src/config/loader.js')
    expect(() => loadConfig()).toThrow("Run 'leetcode-commit init'")
  })

  it('saves and loads config correctly', async () => {
    const { saveConfig, loadConfig } = await import('../../src/config/loader.js')
    const config = {
      leetcode: { sessionCookie: 'test-session-abc123' },
      github: { repoPath: '/tmp/test-repo' },
    }
    saveConfig(config)
    const loaded = loadConfig()
    expect(loaded.leetcode.sessionCookie).toBe('test-session-abc123')
    expect(loaded.github.repoPath).toBe('/tmp/test-repo')
  })

  it('throws on invalid config (missing required fields)', async () => {
    const { saveConfig } = await import('../../src/config/loader.js')
    // @ts-expect-error intentionally invalid
    expect(() => saveConfig({ leetcode: {}, github: {} })).toThrow('Invalid config')
  })

  it('configExists returns false when no config file', async () => {
    const { configExists } = await import('../../src/config/loader.js')
    expect(configExists()).toBe(false)
  })

  it('configExists returns true after saving config', async () => {
    const { saveConfig, configExists } = await import('../../src/config/loader.js')
    saveConfig({
      leetcode: { sessionCookie: 'abc' },
      github: { repoPath: '/tmp/x' },
    })
    expect(configExists()).toBe(true)
  })
})
