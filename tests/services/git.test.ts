import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ProblemInfo } from '../../src/types/index.js'

const mockGit = {
  checkIsRepo: vi.fn(),
  add: vi.fn(),
  status: vi.fn(),
  commit: vi.fn(),
  push: vi.fn(),
  pull: vi.fn(),
  getRemotes: vi.fn(),
}

vi.mock('simple-git', () => ({
  simpleGit: () => mockGit,
}))

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return {
    ...actual,
    existsSync: vi.fn(() => true),
  }
})

const problem: ProblemInfo = {
  frontendQuestionId: '1',
  titleSlug: 'two-sum',
  title: 'Two Sum',
  difficulty: 'Easy',
}

describe('GitService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGit.checkIsRepo.mockResolvedValue(true)
    mockGit.add.mockResolvedValue(undefined)
    mockGit.status.mockResolvedValue({ staged: ['0001-two-sum/solution.py'] })
    mockGit.commit.mockResolvedValue({ commit: 'abc1234' })
    mockGit.push.mockResolvedValue(undefined)
    mockGit.getRemotes.mockResolvedValue([
      { name: 'origin', refs: { fetch: 'https://github.com/user/repo.git' } },
    ])
  })

  it('addAndCommit calls git add, commit with correct message', async () => {
    const { GitService } = await import('../../src/services/git.js')
    const service = new GitService('/fake/repo')

    const result = await service.addAndCommit('/fake/repo/0001-two-sum/solution.py', problem, 'python3')
    expect(mockGit.add).toHaveBeenCalledWith('/fake/repo/0001-two-sum/solution.py')
    expect(mockGit.commit).toHaveBeenCalledWith(
      expect.stringContaining('#1 - Two Sum')
    )
    expect(result.commitHash).toBe('abc1234')
  })

  it('throws when not a git repository', async () => {
    mockGit.checkIsRepo.mockResolvedValue(false)
    const { GitService } = await import('../../src/services/git.js')
    const service = new GitService('/fake/repo')
    await expect(
      service.addAndCommit('/fake/repo/file.py', problem, 'python3')
    ).rejects.toThrow('not a git repository')
  })

  it('throws when no staged files after add', async () => {
    mockGit.status.mockResolvedValue({ staged: [] })
    const { GitService } = await import('../../src/services/git.js')
    const service = new GitService('/fake/repo')
    await expect(
      service.addAndCommit('/fake/repo/file.py', problem, 'python3')
    ).rejects.toThrow('No changes to commit')
  })

  it('push retries with pull --rebase on failure', async () => {
    mockGit.push.mockRejectedValueOnce(new Error('rejected'))
    mockGit.pull.mockResolvedValue(undefined)
    mockGit.push.mockResolvedValueOnce(undefined)

    const { GitService } = await import('../../src/services/git.js')
    const service = new GitService('/fake/repo')
    await expect(service.push()).resolves.not.toThrow()
    expect(mockGit.pull).toHaveBeenCalledWith(['--rebase'])
  })

  it('push throws after retry also fails', async () => {
    mockGit.push.mockRejectedValue(new Error('rejected'))
    mockGit.pull.mockResolvedValue(undefined)

    const { GitService } = await import('../../src/services/git.js')
    const service = new GitService('/fake/repo')
    await expect(service.push()).rejects.toThrow('Git push failed')
  })

  it('getRemoteUrl returns origin url', async () => {
    const { GitService } = await import('../../src/services/git.js')
    const service = new GitService('/fake/repo')
    const url = await service.getRemoteUrl()
    expect(url).toBe('https://github.com/user/repo.git')
  })
})
