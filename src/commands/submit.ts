import { loadConfig } from '../config/loader.js'
import { LeetCodeClient } from '../services/leetcode.js'
import { saveSubmission } from '../services/file.js'
import { GitService } from '../services/git.js'
import { logger } from '../utils/logger.js'
import { getLanguageDisplayName } from '../utils/language-map.js'
import type { SubmitOptions } from '../types/index.js'

export async function submitCommand(
  problemNumbers: number[],
  options: SubmitOptions
): Promise<void> {
  const config = loadConfig()
  const client = new LeetCodeClient(config.leetcode.sessionCookie, config.leetcode.csrfToken)
  const git = new GitService(config.github.repoPath)

  await git.validateRepo()

  for (const problemNumber of problemNumbers) {
    logger.step(`Fetching problem #${problemNumber}...`)

    const { problem, detail } = await client.fetchAcceptedCode(problemNumber)
    const lang = getLanguageDisplayName(detail.lang.name)

    logger.info(`Problem: #${problem.frontendQuestionId} - ${problem.title} (${problem.difficulty})`)
    logger.info(`Language: ${lang}`)

    const saveResult = saveSubmission(config.github.repoPath, problem, detail)

    if (saveResult.isDuplicate) {
      logger.warn(`Already up to date: ${saveResult.filePath}`)
      continue
    }

    logger.success(`File saved: ${saveResult.filePath}`)

    if (options.dryRun) {
      logger.warn('Dry run mode: skipping git commit and push')
      continue
    }

    const commitResult = await git.addAndCommit(saveResult.filePath, problem, detail.lang.name)
    logger.success(`Committed: ${commitResult.commitMessage}`)
    logger.info(`Commit hash: ${commitResult.commitHash}`)

    if (!options.noPush) {
      logger.step('Pushing to remote...')
      await git.push()
      logger.success('Pushed to remote repository')
    }
  }
}
