import { LEETCODE_BASE_URL, LEETCODE_GRAPHQL_URL, ACCEPTED_STATUS } from '../config/constants.js'
import type { ProblemInfo, RecentAcSubmission, Submission, SubmissionDetail } from '../types/index.js'

const PROBLEM_INFO_QUERY = `
  query problemByNumber($filters: QuestionListFilterInput) {
    problemsetQuestionList: questionList(
      categorySlug: ""
      limit: 10
      skip: 0
      filters: $filters
    ) {
      questions: data {
        frontendQuestionId: questionFrontendId
        titleSlug
        title
        difficulty
        topicTags {
          name
        }
      }
    }
  }
`

const SUBMISSION_LIST_QUERY = `
  query submissionList($questionSlug: String!, $status: Int, $limit: Int, $offset: Int) {
    questionSubmissionList(
      questionSlug: $questionSlug
      status: $status
      limit: $limit
      offset: $offset
    ) {
      submissions {
        id
        lang
        statusDisplay
        timestamp
      }
    }
  }
`

const GLOBAL_DATA_QUERY = `
  query globalData {
    userStatus {
      isSignedIn
      username
    }
  }
`

const RECENT_AC_SUBMISSIONS_QUERY = `
  query recentAcSubmissions($username: String!, $limit: Int!) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      id
      title
      titleSlug
      timestamp
    }
  }
`

const QUESTION_BY_SLUG_QUERY = `
  query questionBySlug($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      questionFrontendId
      titleSlug
      title
      difficulty
      topicTags {
        name
      }
    }
  }
`

const SUBMISSION_DETAIL_QUERY = `
  query submissionDetails($submissionId: Int!) {
    submissionDetails(submissionId: $submissionId) {
      code
      lang {
        name
        verboseName
      }
      statusDisplay
      timestamp
      question {
        questionId
        titleSlug
        title
      }
    }
  }
`

export type AuthFailureAttempt = 'auto' | 'interactive'
export type OnAuthFailure = (attempt: AuthFailureAttempt) => Promise<string | null>

export const SESSION_EXPIRED_MESSAGE =
  'LeetCode session expired or invalid.\n' +
  "Please update your session cookie:\n" +
  '  1. Log in to leetcode.com in your browser\n' +
  '  2. Run: leetcode-commit cookie    (auto-extract from browser)\n' +
  '  Or manually:\n' +
  '  3. Open DevTools → Application → Cookies\n' +
  "  4. Copy the 'LEETCODE_SESSION' cookie value\n" +
  '  5. Run: leetcode-commit config set leetcode.sessionCookie <value>'

export interface LeetCodeClientOptions {
  onAuthFailure?: OnAuthFailure
}

export class LeetCodeClient {
  private currentCookie: string
  private readonly csrfToken: string
  private readonly onAuthFailure?: OnAuthFailure

  constructor(sessionCookie: string, csrfToken = '', options: LeetCodeClientOptions = {}) {
    this.currentCookie = sessionCookie
    this.csrfToken = csrfToken
    this.onAuthFailure = options.onAuthFailure
  }

  private async graphql<T>(
    query: string,
    variables: Record<string, unknown>,
    retryStage: 0 | 1 | 2 = 0
  ): Promise<T> {
    const cookie = this.currentCookie.startsWith('LEETCODE_SESSION=')
      ? this.currentCookie
      : `LEETCODE_SESSION=${this.currentCookie}`

    const response = await fetch(LEETCODE_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: this.csrfToken ? `${cookie}; csrftoken=${this.csrfToken}` : cookie,
        Referer: LEETCODE_BASE_URL,
        'User-Agent': 'Mozilla/5.0 (compatible; leetcode-commit/1.0)',
        'x-csrftoken': this.csrfToken,
      },
      body: JSON.stringify({ query, variables }),
    })

    if (response.status === 401 || response.status === 403) {
      if (this.onAuthFailure && retryStage < 2) {
        const stage: AuthFailureAttempt = retryStage === 0 ? 'auto' : 'interactive'
        const fresh = await this.onAuthFailure(stage)
        if (fresh) {
          this.currentCookie = fresh
          return this.graphql<T>(query, variables, (retryStage + 1) as 1 | 2)
        }
      }
      throw new Error(SESSION_EXPIRED_MESSAGE)
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`LeetCode API error: ${response.status} ${response.statusText}\n${body.slice(0, 500)}`)
    }

    const json = (await response.json()) as { data?: T; errors?: Array<{ message: string }> }

    if (json.errors?.length) {
      throw new Error(`LeetCode GraphQL error: ${json.errors.map((e) => e.message).join(', ')}`)
    }

    if (!json.data) {
      throw new Error('LeetCode API returned empty data')
    }

    return json.data
  }

  async getProblemInfo(problemNumber: number): Promise<ProblemInfo> {
    const data = await this.graphql<{
      problemsetQuestionList: {
        questions: Array<{
          frontendQuestionId: string
          titleSlug: string
          title: string
          difficulty: string
          topicTags?: Array<{ name: string }>
        }>
      }
    }>(PROBLEM_INFO_QUERY, {
      filters: { searchKeywords: String(problemNumber) },
    })

    const questions = data.problemsetQuestionList?.questions ?? []
    const problem = questions.find(
      (q) => q.frontendQuestionId === String(problemNumber)
    )

    if (!problem) {
      throw new Error(
        `Problem #${problemNumber} not found. ` +
          'It may be a premium-only problem or the number may be incorrect.'
      )
    }

    return {
      frontendQuestionId: problem.frontendQuestionId,
      titleSlug: problem.titleSlug,
      title: problem.title,
      difficulty: problem.difficulty as ProblemInfo['difficulty'],
      topicTags: (problem.topicTags ?? []).map((t) => t.name),
    }
  }

  async getLatestAcceptedSubmission(titleSlug: string): Promise<Submission> {
    const data = await this.graphql<{
      questionSubmissionList: {
        submissions: Submission[]
      } | null
    }>(SUBMISSION_LIST_QUERY, {
      questionSlug: titleSlug,
      status: ACCEPTED_STATUS,
      limit: 1,
      offset: 0,
    })

    const submissions = data.questionSubmissionList?.submissions ?? []
    if (submissions.length === 0) {
      throw new Error(
        `No accepted submissions found for problem '${titleSlug}'. ` +
          'Make sure you have solved this problem on your account.'
      )
    }

    return submissions[0]
  }

  async getSubmissionDetail(submissionId: string): Promise<SubmissionDetail> {
    const data = await this.graphql<{ submissionDetails: SubmissionDetail }>(
      SUBMISSION_DETAIL_QUERY,
      { submissionId: parseInt(submissionId, 10) }
    )

    if (!data.submissionDetails) {
      throw new Error(`Submission #${submissionId} details not found.`)
    }

    return data.submissionDetails
  }

  async getUsername(): Promise<string> {
    const data = await this.graphql<{ userStatus: { isSignedIn: boolean; username: string } | null }>(
      GLOBAL_DATA_QUERY,
      {}
    )

    const status = data.userStatus
    if (!status?.isSignedIn || !status.username) {
      throw new Error(SESSION_EXPIRED_MESSAGE)
    }

    return status.username
  }

  async getRecentAcceptedSubmissions(limit = 1): Promise<RecentAcSubmission[]> {
    const username = await this.getUsername()

    const data = await this.graphql<{
      recentAcSubmissionList: RecentAcSubmission[] | null
    }>(RECENT_AC_SUBMISSIONS_QUERY, { username, limit })

    const list = data.recentAcSubmissionList ?? []
    if (list.length === 0) {
      throw new Error(`No recent accepted submissions found for user '${username}'.`)
    }

    return list
  }

  async getProblemInfoBySlug(titleSlug: string): Promise<ProblemInfo> {
    const data = await this.graphql<{
      question: {
        questionFrontendId: string
        titleSlug: string
        title: string
        difficulty: string
        topicTags?: Array<{ name: string }>
      } | null
    }>(QUESTION_BY_SLUG_QUERY, { titleSlug })

    if (!data.question) {
      throw new Error(`Problem with slug '${titleSlug}' not found.`)
    }

    const q = data.question
    return {
      frontendQuestionId: q.questionFrontendId,
      titleSlug: q.titleSlug,
      title: q.title,
      difficulty: q.difficulty as ProblemInfo['difficulty'],
      topicTags: (q.topicTags ?? []).map((t) => t.name),
    }
  }

  async fetchLatestAcceptedAcrossAll(): Promise<{
    problem: ProblemInfo
    submission: Submission
    detail: SubmissionDetail
  }> {
    const recent = await this.getRecentAcceptedSubmissions(1)
    const titleSlug = recent[0].titleSlug
    const problem = await this.getProblemInfoBySlug(titleSlug)
    const submission = await this.getLatestAcceptedSubmission(titleSlug)
    const detail = await this.getSubmissionDetail(submission.id)

    return { problem, submission, detail }
  }

  async fetchAcceptedCode(problemNumber: number): Promise<{
    problem: ProblemInfo
    submission: Submission
    detail: SubmissionDetail
  }> {
    const problem = await this.getProblemInfo(problemNumber)
    const submission = await this.getLatestAcceptedSubmission(problem.titleSlug)
    const detail = await this.getSubmissionDetail(submission.id)

    return { problem, submission, detail }
  }
}
