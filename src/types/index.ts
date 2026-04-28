export interface Config {
  leetcode: {
    sessionCookie: string
    csrfToken?: string
  }
  github: {
    repoPath: string
  }
}

export interface ProblemInfo {
  frontendQuestionId: string
  titleSlug: string
  title: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  topicTags: string[]
}

export interface Submission {
  id: string
  lang: string
  statusDisplay: string
  timestamp: string
}

export interface SubmissionDetail {
  code: string
  lang: { name: string; verboseName: string }
  statusDisplay: string
  timestamp: string
  question: {
    questionId: string
    titleSlug: string
    title: string
  }
}

export interface SubmitOptions {
  dryRun: boolean
  noPush: boolean
  noReadme?: boolean
}
