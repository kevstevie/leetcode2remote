import { LEETCODE_BASE_URL, LEETCODE_GRAPHQL_URL, ACCEPTED_STATUS } from '../config/constants.js'
import type { ProblemInfo, Submission, SubmissionDetail } from '../types/index.js'

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

export class LeetCodeClient {
  private readonly sessionCookie: string
  private readonly csrfToken: string

  constructor(sessionCookie: string, csrfToken = '') {
    this.sessionCookie = sessionCookie
    this.csrfToken = csrfToken
  }

  private async graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const cookie = this.sessionCookie.startsWith('LEETCODE_SESSION=')
      ? this.sessionCookie
      : `LEETCODE_SESSION=${this.sessionCookie}`

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
      throw new Error(
        'LeetCode session expired or invalid.\n' +
          "Please update your session cookie:\n" +
          "  1. Log in to leetcode.com in your browser\n" +
          "  2. Open DevTools → Application → Cookies\n" +
          "  3. Copy the 'LEETCODE_SESSION' cookie value\n" +
          "  4. Run: leetcode-commit config set leetcode.sessionCookie <value>"
      )
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
