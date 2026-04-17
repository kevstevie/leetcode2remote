import { describe, it, expect, vi, beforeEach } from 'vitest'
import { submitCommand } from '../../src/commands/submit.js'

const mockLoadConfig = vi.fn()
const mockFetchAcceptedCode = vi.fn()
const mockSaveSubmission = vi.fn()
const mockValidateRepo = vi.fn()
const mockAddAndCommit = vi.fn()
const mockPush = vi.fn()

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: () => mockLoadConfig(),
}))

vi.mock('../../src/services/leetcode.js', () => ({
  LeetCodeClient: vi.fn().mockImplementation(() => ({
    fetchAcceptedCode: mockFetchAcceptedCode,
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

const config = {
  leetcode: { sessionCookie: 'test-session' },
  github: { repoPath: '/fake/repo' },
}

const fetchResult = {
  problem: { frontendQuestionId: '1', titleSlug: 'two-sum', title: 'Two Sum', difficulty: 'Easy', topicTags: ['Array', 'Hash Table'] },
  submission: { id: '42', lang: 'python3', statusDisplay: 'Accepted', timestamp: '1700000000' },
  detail: {
    code: 'return []',
    lang: { name: 'python3', verboseName: 'Python 3' },
    statusDisplay: 'Accepted',
    timestamp: '1700000000',
    question: { questionId: '1', titleSlug: 'two-sum', title: 'Two Sum' },
  },
}

describe('submitCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLoadConfig.mockReturnValue(config)
    mockValidateRepo.mockResolvedValue(undefined)
    mockFetchAcceptedCode.mockResolvedValue(fetchResult)
    mockSaveSubmission.mockReturnValue({ filePath: '/fake/repo/0001-two-sum/solution.py', isNew: true, isDuplicate: false })
    mockAddAndCommit.mockResolvedValue({ commitHash: 'abc123', commitMessage: 'feat: solve #1' })
    mockPush.mockResolvedValue(undefined)
  })

  it('runs full workflow: fetch, save, commit, push', async () => {
    await submitCommand([1], { dryRun: false, noPush: false })
    expect(mockFetchAcceptedCode).toHaveBeenCalledWith(1)
    expect(mockSaveSubmission).toHaveBeenCalled()
    expect(mockAddAndCommit).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalled()
  })

  it('skips commit/push when dry-run', async () => {
    await submitCommand([1], { dryRun: true, noPush: false })
    expect(mockSaveSubmission).toHaveBeenCalled()
    expect(mockAddAndCommit).not.toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('commits but does not push when noPush is true', async () => {
    await submitCommand([1], { dryRun: false, noPush: true })
    expect(mockAddAndCommit).toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('skips commit when file is duplicate', async () => {
    mockSaveSubmission.mockReturnValue({ filePath: '/fake/repo/0001/solution.py', isNew: false, isDuplicate: true })
    await submitCommand([1], { dryRun: false, noPush: false })
    expect(mockAddAndCommit).not.toHaveBeenCalled()
  })

  it('processes multiple problems', async () => {
    await submitCommand([1, 2, 3], { dryRun: false, noPush: false })
    expect(mockFetchAcceptedCode).toHaveBeenCalledTimes(3)
  })

  it('propagates errors from LeetCode client', async () => {
    mockFetchAcceptedCode.mockRejectedValue(new Error('session expired'))
    await expect(submitCommand([1], { dryRun: false, noPush: false })).rejects.toThrow('session expired')
  })
})
