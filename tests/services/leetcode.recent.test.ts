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
    statusText: status === 403 ? 'Forbidden' : 'Unauthorized',
    text: async () => '',
  })
}

const client = new LeetCodeClient('test-session')

describe('LeetCodeClient — recent/slug methods', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('getUsername', () => {
    it('returns username when signed in', async () => {
      mockGqlResponse({ userStatus: { isSignedIn: true, username: 'alice' } })
      const username = await client.getUsername()
      expect(username).toBe('alice')
    })

    it('throws when isSignedIn is false', async () => {
      mockGqlResponse({ userStatus: { isSignedIn: false, username: '' } })
      await expect(client.getUsername()).rejects.toThrow('session expired')
    })

    it('throws when username is missing', async () => {
      mockGqlResponse({ userStatus: { isSignedIn: true, username: '' } })
      await expect(client.getUsername()).rejects.toThrow('session expired')
    })

    it('throws on 401 response', async () => {
      mockGqlError(401)
      await expect(client.getUsername()).rejects.toThrow('session expired')
    })

    it('throws on 403 response', async () => {
      mockGqlError(403)
      await expect(client.getUsername()).rejects.toThrow('session expired')
    })
  })

  describe('getRecentAcceptedSubmissions', () => {
    it('returns list when submissions exist', async () => {
      // First call is getUsername
      mockGqlResponse({ userStatus: { isSignedIn: true, username: 'alice' } })
      // Second call is recentAcSubmissionList
      mockGqlResponse({
        recentAcSubmissionList: [
          { id: '999', title: 'Two Sum', titleSlug: 'two-sum', timestamp: '1700000000' },
        ],
      })
      const list = await client.getRecentAcceptedSubmissions(1)
      expect(list).toHaveLength(1)
      expect(list[0].titleSlug).toBe('two-sum')
      expect(list[0].id).toBe('999')
    })

    it('throws when list is empty', async () => {
      mockGqlResponse({ userStatus: { isSignedIn: true, username: 'alice' } })
      mockGqlResponse({ recentAcSubmissionList: [] })
      await expect(client.getRecentAcceptedSubmissions(1)).rejects.toThrow(
        "No recent accepted submissions found for user 'alice'."
      )
    })

    it('throws when list is null', async () => {
      mockGqlResponse({ userStatus: { isSignedIn: true, username: 'alice' } })
      mockGqlResponse({ recentAcSubmissionList: null })
      await expect(client.getRecentAcceptedSubmissions(1)).rejects.toThrow(
        "No recent accepted submissions found for user 'alice'."
      )
    })
  })

  describe('getProblemInfoBySlug', () => {
    it('returns problem info for a valid slug', async () => {
      mockGqlResponse({
        question: {
          questionFrontendId: '1',
          titleSlug: 'two-sum',
          title: 'Two Sum',
          difficulty: 'Easy',
          topicTags: [{ name: 'Array' }, { name: 'Hash Table' }],
        },
      })
      const info = await client.getProblemInfoBySlug('two-sum')
      expect(info.frontendQuestionId).toBe('1')
      expect(info.titleSlug).toBe('two-sum')
      expect(info.title).toBe('Two Sum')
      expect(info.difficulty).toBe('Easy')
      expect(info.topicTags).toEqual(['Array', 'Hash Table'])
    })

    it('returns empty topicTags when absent from response', async () => {
      mockGqlResponse({
        question: {
          questionFrontendId: '1',
          titleSlug: 'two-sum',
          title: 'Two Sum',
          difficulty: 'Easy',
        },
      })
      const info = await client.getProblemInfoBySlug('two-sum')
      expect(info.topicTags).toEqual([])
    })

    it('throws when question is null', async () => {
      mockGqlResponse({ question: null })
      await expect(client.getProblemInfoBySlug('nonexistent')).rejects.toThrow(
        "Problem with slug 'nonexistent' not found."
      )
    })
  })

  describe('fetchLatestAcceptedAcrossAll', () => {
    it('chains all queries and returns a shape compatible with fetchAcceptedCode', async () => {
      // getUsername
      mockGqlResponse({ userStatus: { isSignedIn: true, username: 'alice' } })
      // recentAcSubmissionList
      mockGqlResponse({
        recentAcSubmissionList: [
          { id: '999', title: 'Two Sum', titleSlug: 'two-sum', timestamp: '1700000000' },
        ],
      })
      // getProblemInfoBySlug (question)
      mockGqlResponse({
        question: {
          questionFrontendId: '1',
          titleSlug: 'two-sum',
          title: 'Two Sum',
          difficulty: 'Easy',
          topicTags: [{ name: 'Array' }],
        },
      })
      // getLatestAcceptedSubmission (questionSubmissionList)
      mockGqlResponse({
        questionSubmissionList: {
          submissions: [
            { id: '42', lang: 'python3', statusDisplay: 'Accepted', timestamp: '1700000000' },
          ],
        },
      })
      // getSubmissionDetail (submissionDetails)
      mockGqlResponse({
        submissionDetails: {
          code: 'return []',
          lang: { name: 'python3', verboseName: 'Python 3' },
          statusDisplay: 'Accepted',
          timestamp: '1700000000',
          question: { questionId: '1', titleSlug: 'two-sum', title: 'Two Sum' },
        },
      })

      const result = await client.fetchLatestAcceptedAcrossAll()

      expect(result.problem.frontendQuestionId).toBe('1')
      expect(result.problem.title).toBe('Two Sum')
      expect(result.submission.id).toBe('42')
      expect(result.detail.code).toBe('return []')
      expect(mockFetch).toHaveBeenCalledTimes(5)
    })
  })
})
