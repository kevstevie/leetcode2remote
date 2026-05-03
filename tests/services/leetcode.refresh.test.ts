import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LeetCodeClient } from '../../src/services/leetcode.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function ok(data: unknown) {
  return { ok: true, status: 200, json: async () => ({ data }) }
}

function unauthorized() {
  return {
    ok: false,
    status: 401,
    statusText: 'Unauthorized',
    json: async () => ({}),
    text: async () => '',
  }
}

const PROBLEM_RESPONSE = {
  problemsetQuestionList: {
    questions: [
      {
        frontendQuestionId: '1',
        titleSlug: 'two-sum',
        title: 'Two Sum',
        difficulty: 'Easy',
        topicTags: [],
      },
    ],
  },
}

describe('LeetCodeClient auto-refresh', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('retries once with refreshed cookie when onAuthFailure returns a value', async () => {
    mockFetch.mockResolvedValueOnce(unauthorized())
    mockFetch.mockResolvedValueOnce(ok(PROBLEM_RESPONSE))

    const onAuthFailure = vi.fn().mockResolvedValueOnce('new-cookie')
    const client = new LeetCodeClient('old-cookie', '', { onAuthFailure })

    const info = await client.getProblemInfo(1)
    expect(info.titleSlug).toBe('two-sum')
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(onAuthFailure).toHaveBeenCalledTimes(1)
    expect(onAuthFailure).toHaveBeenCalledWith('auto')

    const secondCallArgs = mockFetch.mock.calls[1][1] as { headers: Record<string, string> }
    expect(secondCallArgs.headers.Cookie).toContain('new-cookie')
  })

  it('escalates to interactive on second 401, then succeeds', async () => {
    mockFetch.mockResolvedValueOnce(unauthorized())
    mockFetch.mockResolvedValueOnce(unauthorized())
    mockFetch.mockResolvedValueOnce(ok(PROBLEM_RESPONSE))

    const onAuthFailure = vi
      .fn()
      .mockResolvedValueOnce('cookie-from-auto')
      .mockResolvedValueOnce('cookie-from-interactive')

    const client = new LeetCodeClient('old-cookie', '', { onAuthFailure })
    const info = await client.getProblemInfo(1)

    expect(info.titleSlug).toBe('two-sum')
    expect(mockFetch).toHaveBeenCalledTimes(3)
    expect(onAuthFailure).toHaveBeenNthCalledWith(1, 'auto')
    expect(onAuthFailure).toHaveBeenNthCalledWith(2, 'interactive')
  })

  it('throws after two failed retries (auto + interactive)', async () => {
    mockFetch.mockResolvedValueOnce(unauthorized())
    mockFetch.mockResolvedValueOnce(unauthorized())
    mockFetch.mockResolvedValueOnce(unauthorized())

    const onAuthFailure = vi
      .fn()
      .mockResolvedValueOnce('a')
      .mockResolvedValueOnce('b')

    const client = new LeetCodeClient('old', '', { onAuthFailure })
    await expect(client.getProblemInfo(1)).rejects.toThrow(/session expired/i)
    expect(mockFetch).toHaveBeenCalledTimes(3)
    expect(onAuthFailure).toHaveBeenCalledTimes(2)
  })

  it('throws immediately when onAuthFailure returns null', async () => {
    mockFetch.mockResolvedValueOnce(unauthorized())
    const onAuthFailure = vi.fn().mockResolvedValueOnce(null)

    const client = new LeetCodeClient('old', '', { onAuthFailure })
    await expect(client.getProblemInfo(1)).rejects.toThrow(/session expired/i)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('throws without retry when no onAuthFailure is provided', async () => {
    mockFetch.mockResolvedValueOnce(unauthorized())
    const client = new LeetCodeClient('old')
    await expect(client.getProblemInfo(1)).rejects.toThrow(/session expired/i)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
