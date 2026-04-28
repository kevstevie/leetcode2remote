import { existsSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'

export type Difficulty = 'Easy' | 'Medium' | 'Hard'

export interface RepoStats {
  total: number
  byDifficulty: Record<Difficulty, number>
  byTopic: Record<string, number>
}

const DIFFICULTIES: readonly Difficulty[] = ['Easy', 'Medium', 'Hard'] as const
const DIFFICULTY_DIR_SET = new Set<string>(DIFFICULTIES)
const PROBLEM_DIR_PATTERN = /^\d{4}-/
const SOLUTION_FILE_PATTERN = /^solution\.[a-z0-9]+$/i
const DIFFICULTY_HEADER_PATTERN = /Difficulty:\s*(Easy|Medium|Hard)/
const TAGS_HEADER_PATTERN = /Tags:\s*([^\n\r]+)/
const HEADER_READ_BYTES = 2048

interface ParsedHeader {
  difficulty: Difficulty | null
  tags: string[]
}

function findSolutionFile(dirPath: string): string | null {
  if (!existsSync(dirPath)) return null
  const entries = readdirSync(dirPath)
  const found = entries.find((name) => SOLUTION_FILE_PATTERN.test(name))
  return found ? join(dirPath, found) : null
}

function parseHeader(filePath: string): ParsedHeader {
  let content: string
  try {
    content = readFileSync(filePath, 'utf-8').slice(0, HEADER_READ_BYTES)
  } catch {
    return { difficulty: null, tags: [] }
  }

  const diffMatch = DIFFICULTY_HEADER_PATTERN.exec(content)
  const tagsMatch = TAGS_HEADER_PATTERN.exec(content)

  const difficulty = diffMatch ? (diffMatch[1] as Difficulty) : null
  const tags = tagsMatch
    ? tagsMatch[1]
        .split(',')
        .map((t) => t.replace(/\*+\/?\s*$/, '').trim())
        .filter((t) => t.length > 0)
    : []

  return { difficulty, tags }
}

interface ScanContext {
  stats: RepoStats
  seenProblems: Set<string>
}

function recordProblem(
  ctx: ScanContext,
  problemDir: string,
  difficulty: Difficulty,
  tags: string[]
): void {
  if (ctx.seenProblems.has(problemDir)) return
  ctx.seenProblems.add(problemDir)

  ctx.stats.total += 1
  ctx.stats.byDifficulty[difficulty] += 1
  for (const tag of tags) {
    ctx.stats.byTopic[tag] = (ctx.stats.byTopic[tag] ?? 0) + 1
  }
}

function scanDifficultyDir(repoPath: string, difficulty: Difficulty, ctx: ScanContext): void {
  const dirPath = join(repoPath, difficulty)
  if (!existsSync(dirPath)) return

  const entries = readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory() || !PROBLEM_DIR_PATTERN.test(entry.name)) continue
    const solutionFile = findSolutionFile(join(dirPath, entry.name))
    if (!solutionFile) continue

    const { tags } = parseHeader(solutionFile)
    recordProblem(ctx, entry.name, difficulty, tags)
  }
}

function scanTopLevel(repoPath: string, ctx: ScanContext): void {
  if (!existsSync(repoPath)) return

  const entries = readdirSync(repoPath, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (DIFFICULTY_DIR_SET.has(entry.name)) continue
    if (!PROBLEM_DIR_PATTERN.test(entry.name)) continue

    const solutionFile = findSolutionFile(join(repoPath, entry.name))
    if (!solutionFile) continue

    const { difficulty, tags } = parseHeader(solutionFile)
    if (!difficulty) continue

    recordProblem(ctx, entry.name, difficulty, tags)
  }
}

export function scanRepo(repoPath: string): RepoStats {
  const ctx: ScanContext = {
    stats: {
      total: 0,
      byDifficulty: { Easy: 0, Medium: 0, Hard: 0 },
      byTopic: {},
    },
    seenProblems: new Set<string>(),
  }

  for (const difficulty of DIFFICULTIES) {
    scanDifficultyDir(repoPath, difficulty, ctx)
  }
  scanTopLevel(repoPath, ctx)

  return ctx.stats
}
