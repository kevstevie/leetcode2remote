import { existsSync } from 'fs'
import { simpleGit, type SimpleGit } from 'simple-git'
import type { ProblemInfo } from '../types/index.js'

export interface CommitResult {
  commitHash: string
  commitMessage: string
}

function buildCommitMessage(problem: ProblemInfo, lang: string): string {
  const base = `feat: solve #${problem.frontendQuestionId} - ${problem.title} (${problem.difficulty}) [${lang}]`
  if (problem.topicTags.length === 0) return base
  return `${base} [${problem.topicTags.join(', ')}]`
}

export class GitService {
  private readonly git: SimpleGit
  private readonly repoPath: string

  constructor(repoPath: string) {
    if (!existsSync(repoPath)) {
      throw new Error(`Repository path does not exist: ${repoPath}`)
    }
    this.repoPath = repoPath
    this.git = simpleGit(repoPath)
  }

  async validateRepo(): Promise<void> {
    const isRepo = await this.git.checkIsRepo()
    if (!isRepo) {
      throw new Error(
        `Path is not a git repository: ${this.repoPath}\n` +
          'Please clone your GitHub repository first and set the path in config.'
      )
    }
  }

  async addAndCommit(filePath: string, problem: ProblemInfo, lang: string): Promise<CommitResult> {
    await this.validateRepo()

    await this.git.add(filePath)

    const status = await this.git.status()
    if (status.staged.length === 0) {
      throw new Error('No changes to commit. File may already be up to date.')
    }

    const message = buildCommitMessage(problem, lang)
    const result = await this.git.commit(message)

    const commitHash = result.commit ?? 'unknown'
    return { commitHash, commitMessage: message }
  }

  async push(): Promise<void> {
    try {
      await this.git.push()
    } catch (pushError) {
      // Try pull --rebase then push again
      try {
        await this.git.pull(['--rebase'])
        await this.git.push()
      } catch {
        throw new Error(
          `Git push failed. Please resolve conflicts manually in: ${this.repoPath}\n` +
            `Original error: ${pushError instanceof Error ? pushError.message : String(pushError)}`
        )
      }
    }
  }

  async getRemoteUrl(): Promise<string> {
    try {
      const remotes = await this.git.getRemotes(true)
      const origin = remotes.find((r) => r.name === 'origin')
      return origin?.refs?.fetch ?? ''
    } catch {
      return ''
    }
  }
}
