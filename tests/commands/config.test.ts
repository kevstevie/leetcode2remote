import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockLoadConfig = vi.fn()
const mockSaveConfig = vi.fn()
const mockGetConfigPath = vi.fn(() => '/home/user/.leetcode-commit/config.json')

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: () => mockLoadConfig(),
  saveConfig: (...args: unknown[]) => mockSaveConfig(...args),
  getConfigPath: () => mockGetConfigPath(),
}))

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), success: vi.fn(), warn: vi.fn(), error: vi.fn(), step: vi.fn() },
}))

const baseConfig = {
  leetcode: { sessionCookie: 'my-session', csrfToken: undefined },
  github: { repoPath: '/path/to/repo' },
}

describe('config commands', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLoadConfig.mockReturnValue(structuredClone(baseConfig))
  })

  describe('configGetCommand', () => {
    it('prints value for valid key', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const { configGetCommand } = await import('../../src/commands/config.js')
      configGetCommand('github.repoPath')
      expect(consoleSpy).toHaveBeenCalledWith('/path/to/repo')
      consoleSpy.mockRestore()
    })

    it('exits with code 1 for undefined key', async () => {
      const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') })
      const { configGetCommand } = await import('../../src/commands/config.js')
      expect(() => configGetCommand('leetcode.csrfToken' as never)).toThrow('exit')
      processExitSpy.mockRestore()
    })
  })

  describe('configSetCommand', () => {
    it('saves updated config', async () => {
      const { configSetCommand } = await import('../../src/commands/config.js')
      configSetCommand('github.repoPath', '/new/path')
      expect(mockSaveConfig).toHaveBeenCalledWith(
        expect.objectContaining({ github: { repoPath: '/new/path' } })
      )
    })

    it('redacts cookie in success log', async () => {
      const { logger } = await import('../../src/utils/logger.js')
      const { configSetCommand } = await import('../../src/commands/config.js')
      configSetCommand('leetcode.sessionCookie', 'secret123')
      expect(logger.success).toHaveBeenCalledWith(expect.stringContaining('[redacted]'))
    })
  })

  describe('configListCommand', () => {
    it('prints config with redacted session cookie', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const { configListCommand } = await import('../../src/commands/config.js')
      configListCommand()
      const output = consoleSpy.mock.calls.map((c) => c.join('')).join('\n')
      expect(output).toContain('[set]')
      expect(output).not.toContain('my-session')
      consoleSpy.mockRestore()
    })
  })
})
