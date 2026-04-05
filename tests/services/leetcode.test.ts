import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LeetCodeClient } from '../../src/services/leetcode.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function mockGqlResponse(data: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ data }),
  })
}

function mockGqlError(status: number) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    statusText: status === 403 ? 'Forbidden' : 'Error',
    json: async () => ({}),
  })
}

const client = new LeetCodeClient('test-session')

describe('LeetCodeClient', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('getProblemInfo', () => {
    it('returns problem info for valid number', async () => {
      mockGqlResponse({
        problemsetQuestionList: {
          questions: [
            { frontendQuestionId: '1', titleSlug: 'two-sum', title: 'Two Sum', difficulty: 'Easy' },
            { frontendQuestionId: '10', titleSlug: 'regular-expression-matching', title: 'Regex', difficulty: 'Hard' },
          ],
        },
      })
      const info = await client.getProblemInfo(1)
      expect(info.frontendQuestionId).toBe('1')
      expect(info.titleSlug).toBe('two-sum')
      expect(info.difficulty).toBe('Easy')
    })

    it('throws when problem not found', async () => {
      mockGqlResponse({ problemsetQuestionList: { questions: [] } })
      await expect(client.getProblemInfo(9999)).rejects.toThrow('not found')
    })

    it('throws on 401 with session expired message', async () => {
      mockGqlError(401)
      await expect(client.getProblemInfo(1)).rejects.toThrow('session expired')
    })

    it('throws on 403', async () => {
      mockGqlError(403)
      await expect(client.getProblemInfo(1)).rejects.toThrow('session expired')
    })
  })

  describe('getLatestAcceptedSubmission', () => {
    it('returns the first accepted submission', async () => {
      mockGqlResponse({
        questionSubmissionList: {
          submissions: [
            { id: '123', lang: 'python3', statusDisplay: 'Accepted', timestamp: '1700000000' },
          ],
        },
      })
      const sub = await client.getLatestAcceptedSubmission('two-sum')
      expect(sub.id).toBe('123')
      expect(sub.lang).toBe('python3')
    })

    it('throws when no accepted submissions', async () => {
      mockGqlResponse({ questionSubmissionList: { submissions: [] } })
      await expect(client.getLatestAcceptedSubmission('two-sum')).rejects.toThrow(
        'No accepted submissions'
      )
    })

    it('throws when questionSubmissionList is null', async () => {
      mockGqlResponse({ questionSubmissionList: null })
      await expect(client.getLatestAcceptedSubmission('two-sum')).rejects.toThrow(
        'No accepted submissions'
      )
    })
  })

  describe('getSubmissionDetail', () => {
    it('returns submission detail', async () => {
      mockGqlResponse({
        submissionDetails: {
          code: 'def twoSum(nums, target): pass',
          lang: { name: 'python3', verboseName: 'Python 3' },
          statusDisplay: 'Accepted',
          timestamp: '1700000000',
          question: { questionId: '1', titleSlug: 'two-sum', title: 'Two Sum' },
        },
      })
      const detail = await client.getSubmissionDetail('123')
      expect(detail.code).toBe('def twoSum(nums, target): pass')
      expect(detail.lang.name).toBe('python3')
    })

    it('throws when submissionDetails is null', async () => {
      mockGqlResponse({ submissionDetails: null })
      await expect(client.getSubmissionDetail('999')).rejects.toThrow('not found')
    })
  })

  describe('fetchAcceptedCode', () => {
    it('chains all three queries', async () => {
      mockGqlResponse({
        problemsetQuestionList: {
          questions: [{ frontendQuestionId: '1', titleSlug: 'two-sum', title: 'Two Sum', difficulty: 'Easy' }],
        },
      })
      mockGqlResponse({
        questionSubmissionList: {
          submissions: [{ id: '42', lang: 'python3', statusDisplay: 'Accepted', timestamp: '1700000000' }],
        },
      })
      mockGqlResponse({
        submissionDetails: {
          code: 'return []',
          lang: { name: 'python3', verboseName: 'Python 3' },
          statusDisplay: 'Accepted',
          timestamp: '1700000000',
          question: { questionId: '1', titleSlug: 'two-sum', title: 'Two Sum' },
        },
      })
      const result = await client.fetchAcceptedCode(1)
      expect(result.problem.title).toBe('Two Sum')
      expect(result.submission.id).toBe('42')
      expect(result.detail.code).toBe('return []')
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })
})
