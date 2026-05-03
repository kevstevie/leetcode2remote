import { loadConfig } from '../config/loader.js'
import { LeetCodeClient } from '../services/leetcode.js'
import { GitService } from '../services/git.js'
import { logger } from '../utils/logger.js'
import { processSubmission } from './submit.js'
import { runReadmeUpdate } from './readme.js'
import type { SubmitOptions } from '../types/index.js'

export async function latestCommand(options: SubmitOptions): Promise<void> {
  logger.info('No problem number given — fetching your latest accepted submission.')

  const config = loadConfig()
  const client = new LeetCodeClient(config.leetcode.sessionCookie, config.leetcode.csrfToken)
  const git = new GitService(config.github.repoPath)

  await git.validateRepo()

  logger.step('Fetching latest accepted submission across all problems...')

  const { problem, detail } = await client.fetchLatestAcceptedAcrossAll()
  const { committed } = await processSubmission(config.github.repoPath, git, problem, detail, options)

  if (committed && !options.dryRun && !options.noReadme) {
    await runReadmeUpdate(config.github.repoPath, {
      dryRun: false,
      noCommit: false,
      noPush: options.noPush,
    })
  }
}
