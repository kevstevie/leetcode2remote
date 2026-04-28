import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { scanRepo } from '../../src/services/stats.js'

const testRepo = join(tmpdir(), 'lc-stats-test-' + Date.now())

interface SeedOptions {
  difficulty: 'Easy' | 'Medium' | 'Hard'
  tags?: string[]
  underDifficultyDir?: boolean
  ext?: string
}

function seedProblem(repoPath: string, dirName: string, opts: SeedOptions): void {
  const ext = opts.ext ?? '.py'
  const placement = opts.underDifficultyDir ?? true ? join(repoPath, opts.difficulty, dirName) : join(repoPath, dirName)
  mkdirSync(placement, { recursive: true })

  const lines = [
    `# Problem: #${dirName}`,
    `# Difficulty: ${opts.difficulty}`,
    `# Language: Python3`,
    `# URL: https://leetcode.com/problems/x/`,
    `# Submitted: 2024-01-01`,
  ]
  if (opts.tags && opts.tags.length > 0) {
    lines.push(`# Tags: ${opts.tags.join(', ')}`)
  }
  lines.push('', 'def solve(): pass\n')
  writeFileSync(join(placement, `solution${ext}`), lines.join('\n'))
}

describe('scanRepo', () => {
  beforeEach(() => {
    mkdirSync(testRepo, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testRepo)) rmSync(testRepo, { recursive: true })
  })

  it('returns zero counts for an empty repo', () => {
    const stats = scanRepo(testRepo)
    expect(stats.total).toBe(0)
    expect(stats.byDifficulty).toEqual({ Easy: 0, Medium: 0, Hard: 0 })
    expect(stats.byTopic).toEqual({})
  })

  it('counts problems organized under difficulty subdirectories', () => {
    seedProblem(testRepo, '0001-two-sum', { difficulty: 'Easy', tags: ['Array', 'Hash Table'] })
    seedProblem(testRepo, '0015-3sum', { difficulty: 'Medium', tags: ['Array', 'Two Pointers'] })
    seedProblem(testRepo, '0042-trapping-rain-water', { difficulty: 'Hard', tags: ['Array', 'Stack'] })

    const stats = scanRepo(testRepo)
    expect(stats.total).toBe(3)
    expect(stats.byDifficulty).toEqual({ Easy: 1, Medium: 1, Hard: 1 })
    expect(stats.byTopic.Array).toBe(3)
    expect(stats.byTopic['Hash Table']).toBe(1)
    expect(stats.byTopic['Two Pointers']).toBe(1)
    expect(stats.byTopic.Stack).toBe(1)
  })

  it('counts top-level (un-migrated) problems by parsing header difficulty', () => {
    seedProblem(testRepo, '0001-two-sum', { difficulty: 'Easy', tags: ['Array'], underDifficultyDir: false })
    const stats = scanRepo(testRepo)
    expect(stats.total).toBe(1)
    expect(stats.byDifficulty.Easy).toBe(1)
    expect(stats.byTopic.Array).toBe(1)
  })

  it('does not double-count when a problem dir name appears in both top-level and difficulty subdir', () => {
    seedProblem(testRepo, '0001-two-sum', { difficulty: 'Easy', tags: ['Array'], underDifficultyDir: true })
    seedProblem(testRepo, '0001-two-sum', { difficulty: 'Easy', tags: ['Array'], underDifficultyDir: false })
    const stats = scanRepo(testRepo)
    expect(stats.total).toBe(1)
    expect(stats.byTopic.Array).toBe(1)
  })

  it('skips directories without a solution file', () => {
    mkdirSync(join(testRepo, 'Easy', '0001-two-sum'), { recursive: true })
    const stats = scanRepo(testRepo)
    expect(stats.total).toBe(0)
  })

  it('skips non-problem directories (no NNNN- prefix)', () => {
    mkdirSync(join(testRepo, 'notes'), { recursive: true })
    writeFileSync(join(testRepo, 'notes', 'solution.py'), '# Difficulty: Easy\n')
    const stats = scanRepo(testRepo)
    expect(stats.total).toBe(0)
  })

  it('handles missing tags gracefully', () => {
    seedProblem(testRepo, '0001-two-sum', { difficulty: 'Easy' })
    const stats = scanRepo(testRepo)
    expect(stats.total).toBe(1)
    expect(stats.byTopic).toEqual({})
  })

  it('parses tags from a multi-line comment block (JS-style header)', () => {
    const dir = join(testRepo, 'Medium', '0015-3sum')
    mkdirSync(dir, { recursive: true })
    const content = [
      '/**',
      ' * Problem: #15 - 3Sum',
      ' * Difficulty: Medium',
      ' * Language: JavaScript',
      ' * URL: https://leetcode.com/problems/3sum/',
      ' * Submitted: 2024-01-01',
      ' * Tags: Array, Two Pointers, Sorting',
      ' */',
      '',
      'function threeSum(nums) { return []; }\n',
    ].join('\n')
    writeFileSync(join(dir, 'solution.js'), content)
    const stats = scanRepo(testRepo)
    expect(stats.total).toBe(1)
    expect(stats.byDifficulty.Medium).toBe(1)
    expect(stats.byTopic.Array).toBe(1)
    expect(stats.byTopic['Two Pointers']).toBe(1)
    expect(stats.byTopic.Sorting).toBe(1)
  })

  it('finds solution files regardless of extension', () => {
    seedProblem(testRepo, '0001-two-sum', { difficulty: 'Easy', tags: ['Array'], ext: '.cpp' })
    const stats = scanRepo(testRepo)
    expect(stats.total).toBe(1)
  })
})
