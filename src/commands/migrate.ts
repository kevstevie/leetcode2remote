import { readdirSync, renameSync, existsSync, readFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { logger } from '../utils/logger.js'

const DIFFICULTY_DIRS = new Set(['Easy', 'Medium', 'Hard'])
const PROBLEM_DIR_PATTERN = /^\d{4}-/
const DIFFICULTY_HEADER_PATTERN = /Difficulty:\s*(Easy|Medium|Hard)/

const SOLUTION_EXTENSIONS = ['.py', '.js', '.ts', '.java', '.cpp', '.c', '.cs', '.go', '.rs', '.rb', '.kt', '.swift', '.scala', '.dart']

interface MigrateOptions {
  dryRun: boolean
}

interface MigrateResult {
  moved: Array<{ from: string; to: string }>
  skipped: Array<{ dir: string; reason: string }>
  planned: Array<{ from: string; to: string }>
}

function findSolutionFile(dirPath: string): string | null {
  for (const ext of SOLUTION_EXTENSIONS) {
    const candidate = join(dirPath, `solution${ext}`)
    if (existsSync(candidate)) return candidate
  }
  return null
}

function parseDifficulty(filePath: string): 'Easy' | 'Medium' | 'Hard' | null {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const match = DIFFICULTY_HEADER_PATTERN.exec(content)
    if (match) return match[1] as 'Easy' | 'Medium' | 'Hard'
    return null
  } catch {
    return null
  }
}

export async function migrateCommand(repoPath: string, options: MigrateOptions): Promise<MigrateResult> {
  const result: MigrateResult = { moved: [], skipped: [], planned: [] }

  const entries = readdirSync(repoPath, { withFileTypes: true })
  const problemDirs = entries.filter(
    (e) => e.isDirectory() && PROBLEM_DIR_PATTERN.test(e.name) && !DIFFICULTY_DIRS.has(e.name)
  )

  for (const entry of problemDirs) {
    const srcDir = join(repoPath, entry.name)
    const solutionFile = findSolutionFile(srcDir)

    if (!solutionFile) {
      result.skipped.push({ dir: entry.name, reason: 'no solution file found' })
      logger.warn(`Skipping ${entry.name}: no solution file found`)
      continue
    }

    const difficulty = parseDifficulty(solutionFile)

    if (!difficulty) {
      result.skipped.push({ dir: entry.name, reason: 'could not parse difficulty from header' })
      logger.warn(`Skipping ${entry.name}: could not parse difficulty from header`)
      continue
    }

    const destDir = join(repoPath, difficulty, entry.name)

    if (options.dryRun) {
      result.planned.push({ from: srcDir, to: destDir })
      logger.info(`[dry-run] Would move: ${entry.name} → ${difficulty}/${entry.name}`)
      continue
    }

    mkdirSync(join(repoPath, difficulty), { recursive: true })
    renameSync(srcDir, destDir)
    result.moved.push({ from: srcDir, to: destDir })
    logger.info(`Moved: ${entry.name} → ${difficulty}/${entry.name}`)
  }

  if (!options.dryRun) {
    logger.info(`Migration complete: ${result.moved.length} moved, ${result.skipped.length} skipped`)
  } else {
    logger.info(`Dry run: ${result.planned.length} would be moved, ${result.skipped.length} skipped`)
  }

  return result
}
