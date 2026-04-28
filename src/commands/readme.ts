import { loadConfig } from '../config/loader.js'
import { scanRepo, type RepoStats } from '../services/stats.js'
import { updateReadme } from '../services/readme.js'
import { GitService } from '../services/git.js'
import { logger } from '../utils/logger.js'

interface ReadmeOptions {
  dryRun: boolean
  noCommit: boolean
  noPush: boolean
}

export interface ReadmeRunResult {
  stats: RepoStats
  changed: boolean
  committed: boolean
  pushed: boolean
}

export async function readmeCommand(options: ReadmeOptions): Promise<ReadmeRunResult> {
  const config = loadConfig()
  return runReadmeUpdate(config.github.repoPath, options)
}

export async function runReadmeUpdate(
  repoPath: string,
  options: ReadmeOptions
): Promise<ReadmeRunResult> {
  logger.step('Scanning repository for solutions...')
  const stats = scanRepo(repoPath)
  logger.info(
    `Found ${stats.total} problems · Easy ${stats.byDifficulty.Easy} · Medium ${stats.byDifficulty.Medium} · Hard ${stats.byDifficulty.Hard}`
  )
  logger.info(`Topics: ${Object.keys(stats.byTopic).length}`)

  if (options.dryRun) {
    logger.warn('Dry run mode: skipping README update')
    return { stats, changed: false, committed: false, pushed: false }
  }

  const result = updateReadme(repoPath, stats)
  if (!result.changed) {
    logger.info('README.md is already up to date')
    return { stats, changed: false, committed: false, pushed: false }
  }
  logger.success(`Updated: ${result.path}`)

  if (options.noCommit) {
    logger.warn('Skipping git commit (--no-commit)')
    return { stats, changed: true, committed: false, pushed: false }
  }

  const git = new GitService(repoPath)
  await git.validateRepo()

  const message = `docs: update README stats (${stats.total} problems)`
  const commitResult = await git.addManyAndCommit([result.path], message)
  logger.success(`Committed: ${commitResult.commitMessage}`)
  logger.info(`Commit hash: ${commitResult.commitHash}`)

  if (options.noPush) {
    return { stats, changed: true, committed: true, pushed: false }
  }

  logger.step('Pushing to remote...')
  await git.push()
  logger.success('Pushed to remote repository')
  return { stats, changed: true, committed: true, pushed: true }
}
