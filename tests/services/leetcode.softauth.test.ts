import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LeetCodeClient } from '../../src/services/leetcode.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function ok(data: unknown) {
  return { ok: true, status: 200, json: async () => ({ data }) }
}

const SIGNED_OUT = { userStatus: { isSignedIn: false, username: '' } }
const SIGNED_IN = { userStatus: { isSignedIn: true, username: 'kevstevie' } }

const SUBMISSIONS_SIGNED_OUT = { questionSubmissionList: { submissions: null } }
const SUBMISSIONS_UNSOLVED = { questionSubmissionList: { submissions: [] } }
const SUBMISSIONS_OK = {
  questionSubmissionList: {
    submissions: [{ id: '42', lang: 'python3', statusDisplay: 'Accepted', timestamp: '1' }],
  },
}

/**
 * LeetCode answers an expired session with HTTP 200 and a null payload rather than
 * 401/403, so these cases cover the "soft" auth failure that the status-code ladder
 * never sees.
 */
describe('LeetCodeClient soft auth failure', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('refreshes and retries when a null submission list is confirmed signed out', async () => {
    mockFetch.mockResolvedValueOnce(ok(SUBMISSIONS_SIGNED_OUT))
    mockFetch.mockResolvedValueOnce(ok(SIGNED_OUT))
    mockFetch.mockResolvedValueOnce(ok(SUBMISSIONS_OK))

    const onAuthFailure = vi.fn().mockResolvedValueOnce('fresh-cookie')
    const client = new LeetCodeClient('stale', '', { onAuthFailure })

    const submission = await client.getLatestAcceptedSubmission('two-sum')

    expect(submission.id).toBe('42')
    expect(onAuthFailure).toHaveBeenCalledTimes(1)
    expect(onAuthFailure).toHaveBeenCalledWith('auto')

    const retryHeaders = mockFetch.mock.calls[2][1] as { headers: Record<string, string> }
    expect(retryHeaders.headers.Cookie).toContain('fresh-cookie')
  })

  it('does not refresh when signed in and the problem is simply unsolved', async () => {
    mockFetch.mockResolvedValueOnce(ok(SUBMISSIONS_UNSOLVED))

    const onAuthFailure = vi.fn()
    const client = new LeetCodeClient('good', '', { onAuthFailure })

    await expect(client.getLatestAcceptedSubmission('bus-routes')).rejects.toThrow(
      /No accepted submissions found/
    )
    expect(onAuthFailure).not.toHaveBeenCalled()
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('does not refresh when the probe reports the session is still valid', async () => {
    mockFetch.mockResolvedValueOnce(ok(SUBMISSIONS_SIGNED_OUT))
    mockFetch.mockResolvedValueOnce(ok(SIGNED_IN))

    const onAuthFailure = vi.fn()
    const client = new LeetCodeClient('good', '', { onAuthFailure })

    await expect(client.getLatestAcceptedSubmission('two-sum')).rejects.toThrow(
      /No accepted submissions found/
    )
    expect(onAuthFailure).not.toHaveBeenCalled()
  })

  it('reports session expiry rather than "not solved" when no handler is configured', async () => {
    mockFetch.mockResolvedValueOnce(ok(SUBMISSIONS_SIGNED_OUT))
    mockFetch.mockResolvedValueOnce(ok(SIGNED_OUT))

    const client = new LeetCodeClient('stale')

    await expect(client.getLatestAcceptedSubmission('two-sum')).rejects.toThrow(/session expired/i)
  })

  it('escalates to interactive when the auto refresh cookie is still signed out', async () => {
    mockFetch.mockResolvedValueOnce(ok(SUBMISSIONS_SIGNED_OUT))
    mockFetch.mockResolvedValueOnce(ok(SIGNED_OUT))
    mockFetch.mockResolvedValueOnce(ok(SUBMISSIONS_SIGNED_OUT))
    mockFetch.mockResolvedValueOnce(ok(SIGNED_OUT))
    mockFetch.mockResolvedValueOnce(ok(SUBMISSIONS_OK))

    const onAuthFailure = vi
      .fn()
      .mockResolvedValueOnce('auto-cookie')
      .mockResolvedValueOnce('interactive-cookie')

    const client = new LeetCodeClient('stale', '', { onAuthFailure })
    const submission = await client.getLatestAcceptedSubmission('two-sum')

    expect(submission.id).toBe('42')
    expect(onAuthFailure).toHaveBeenNthCalledWith(1, 'auto')
    expect(onAuthFailure).toHaveBeenNthCalledWith(2, 'interactive')
  })

  it('gives up after the auto and interactive attempts instead of looping', async () => {
    mockFetch.mockResolvedValue(ok(SUBMISSIONS_SIGNED_OUT))
    mockFetch.mockResolvedValueOnce(ok(SUBMISSIONS_SIGNED_OUT))
    mockFetch.mockResolvedValueOnce(ok(SIGNED_OUT))
    mockFetch.mockResolvedValueOnce(ok(SUBMISSIONS_SIGNED_OUT))
    mockFetch.mockResolvedValueOnce(ok(SIGNED_OUT))
    mockFetch.mockResolvedValueOnce(ok(SUBMISSIONS_SIGNED_OUT))
    mockFetch.mockResolvedValueOnce(ok(SIGNED_OUT))

    const onAuthFailure = vi.fn().mockResolvedValue('never-works')
    const client = new LeetCodeClient('stale', '', { onAuthFailure })

    await expect(client.getLatestAcceptedSubmission('two-sum')).rejects.toThrow(/session expired/i)
    expect(onAuthFailure).toHaveBeenCalledTimes(2)
  })

  it('stops when the refresh handler declines to produce a cookie', async () => {
    mockFetch.mockResolvedValueOnce(ok(SUBMISSIONS_SIGNED_OUT))
    mockFetch.mockResolvedValueOnce(ok(SIGNED_OUT))

    const onAuthFailure = vi.fn().mockResolvedValueOnce(null)
    const client = new LeetCodeClient('stale', '', { onAuthFailure })

    await expect(client.getLatestAcceptedSubmission('two-sum')).rejects.toThrow(/session expired/i)
    expect(onAuthFailure).toHaveBeenCalledTimes(1)
  })

  it('refreshes when getUsername sees isSignedIn false', async () => {
    mockFetch.mockResolvedValueOnce(ok(SIGNED_OUT))
    mockFetch.mockResolvedValueOnce(ok(SIGNED_OUT))
    mockFetch.mockResolvedValueOnce(ok(SIGNED_IN))

    const onAuthFailure = vi.fn().mockResolvedValueOnce('fresh-cookie')
    const client = new LeetCodeClient('stale', '', { onAuthFailure })

    await expect(client.getUsername()).resolves.toBe('kevstevie')
    expect(onAuthFailure).toHaveBeenCalledWith('auto')
  })

  it('refreshes when submission details come back null for a signed-out session', async () => {
    mockFetch.mockResolvedValueOnce(ok({ submissionDetails: null }))
    mockFetch.mockResolvedValueOnce(ok(SIGNED_OUT))
    mockFetch.mockResolvedValueOnce(ok({ submissionDetails: { code: 'x', lang: { name: 'python3' } } }))

    const onAuthFailure = vi.fn().mockResolvedValueOnce('fresh-cookie')
    const client = new LeetCodeClient('stale', '', { onAuthFailure })

    const detail = await client.getSubmissionDetail('42')
    expect(detail.code).toBe('x')
    expect(onAuthFailure).toHaveBeenCalledTimes(1)
  })

  it('keeps the original error when details are missing but the session is valid', async () => {
    mockFetch.mockResolvedValueOnce(ok({ submissionDetails: null }))
    mockFetch.mockResolvedValueOnce(ok(SIGNED_IN))

    const onAuthFailure = vi.fn()
    const client = new LeetCodeClient('good', '', { onAuthFailure })

    await expect(client.getSubmissionDetail('42')).rejects.toThrow(/details not found/)
    expect(onAuthFailure).not.toHaveBeenCalled()
  })

  it('does not treat a failed probe as proof of expiry', async () => {
    mockFetch.mockResolvedValueOnce(ok(SUBMISSIONS_SIGNED_OUT))
    mockFetch.mockRejectedValueOnce(new Error('network down'))

    const onAuthFailure = vi.fn()
    const client = new LeetCodeClient('good', '', { onAuthFailure })

    await expect(client.getLatestAcceptedSubmission('two-sum')).rejects.toThrow(
      /No accepted submissions found/
    )
    expect(onAuthFailure).not.toHaveBeenCalled()
  })
})
