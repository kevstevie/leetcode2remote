import { describe, it, expect, vi, beforeEach } from 'vitest'
import { latestCommand } from '../../src/commands/latest.js'

const mockLoadConfig = vi.fn()
const mockFetchLatestAcceptedAcrossAll = vi.fn()
const mockSaveSubmission = vi.fn()
const mockValidateRepo = vi.fn()
const mockAddAndCommit = vi.fn()
const mockPush = vi.fn()
const mockRunReadmeUpdate = vi.fn()

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: () => mockLoadConfig(),
}))

vi.mock('../../src/services/leetcode.js', () => ({
  LeetCodeClient: vi.fn().mockImplementation(() => ({
    fetchLatestAcceptedAcrossAll: mockFetchLatestAcceptedAcrossAll,
  })),
}))

vi.mock('../../src/services/file.js', () => ({
  saveSubmission: (...args: unknown[]) => mockSaveSubmission(...args),
}))

vi.mock('../../src/services/git.js', () => ({
  GitService: vi.fn().mockImplementation(() => ({
    validateRepo: mockValidateRepo,
    addAndCommit: mockAddAndCommit,
    push: mockPush,
  })),
}))

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), success: vi.fn(), warn: vi.fn(), error: vi.fn(), step: vi.fn() },
}))

vi.mock('../../src/commands/readme.js', () => ({
  runReadmeUpdate: (...args: unknown[]) => mockRunReadmeUpdate(...args),
}))

const config = {
  leetcode: { sessionCookie: 'test-session' },
  github: { repoPath: '/fake/repo' },
}

const fetchResult = {
  problem: {
    frontendQuestionId: '1',
    titleSlug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    topicTags: ['Array', 'Hash Table'],
  },
  submission: { id: '42', lang: 'python3', statusDisplay: 'Accepted', timestamp: '1700000000' },
  detail: {
    code: 'return []',
    lang: { name: 'python3', verboseName: 'Python 3' },
    statusDisplay: 'Accepted',
    timestamp: '1700000000',
    question: { questionId: '1', titleSlug: 'two-sum', title: 'Two Sum' },
  },
}

describe('latestCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLoadConfig.mockReturnValue(config)
    mockValidateRepo.mockResolvedValue(undefined)
    mockFetchLatestAcceptedAcrossAll.mockResolvedValue(fetchResult)
    mockSaveSubmission.mockReturnValue({
      filePath: '/fake/repo/0001-two-sum/solution.py',
      isNew: true,
      isDuplicate: false,
    })
    mockAddAndCommit.mockResolvedValue({ commitHash: 'abc123', commitMessage: 'feat: solve #1' })
    mockPush.mockResolvedValue(undefined)
    mockRunReadmeUpdate.mockResolvedValue({ stats: {}, changed: true, committed: true, pushed: true })
  })

  it('runs full workflow: fetch latest, save, commit, push, readme', async () => {
    await latestCommand({ dryRun: false, noPush: false, noReadme: false })

    expect(mockFetchLatestAcceptedAcrossAll).toHaveBeenCalledOnce()
    expect(mockSaveSubmission).toHaveBeenCalledWith(
      config.github.repoPath,
      fetchResult.problem,
      fetchResult.detail,
    )
    expect(mockAddAndCommit).toHaveBeenCalledOnce()
    expect(mockPush).toHaveBeenCalledOnce()
    expect(mockRunReadmeUpdate).toHaveBeenCalledWith(config.github.repoPath, {
      dryRun: false,
      noCommit: false,
      noPush: false,
    })
  })

  it('skips commit, push, and readme when --dry-run', async () => {
    await latestCommand({ dryRun: true, noPush: false, noReadme: false })

    expect(mockSaveSubmission).toHaveBeenCalledOnce()
    expect(mockAddAndCommit).not.toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
    expect(mockRunReadmeUpdate).not.toHaveBeenCalled()
  })

  it('commits but does not push when --no-push', async () => {
    await latestCommand({ dryRun: false, noPush: true, noReadme: false })

    expect(mockAddAndCommit).toHaveBeenCalledOnce()
    expect(mockPush).not.toHaveBeenCalled()
    expect(mockRunReadmeUpdate).toHaveBeenCalledWith(config.github.repoPath, {
      dryRun: false,
      noCommit: false,
      noPush: true,
    })
  })

  it('skips readme when --no-readme', async () => {
    await latestCommand({ dryRun: false, noPush: false, noReadme: true })

    expect(mockAddAndCommit).toHaveBeenCalledOnce()
    expect(mockPush).toHaveBeenCalledOnce()
    expect(mockRunReadmeUpdate).not.toHaveBeenCalled()
  })

  it('skips commit and readme when file is duplicate', async () => {
    mockSaveSubmission.mockReturnValue({
      filePath: '/fake/repo/0001-two-sum/solution.py',
      isNew: false,
      isDuplicate: true,
    })

    await latestCommand({ dryRun: false, noPush: false, noReadme: false })

    expect(mockAddAndCommit).not.toHaveBeenCalled()
    expect(mockRunReadmeUpdate).not.toHaveBeenCalled()
  })

  it('propagates errors from LeetCode client', async () => {
    mockFetchLatestAcceptedAcrossAll.mockRejectedValue(new Error('session expired'))
    await expect(latestCommand({ dryRun: false, noPush: false })).rejects.toThrow('session expired')
  })
})
