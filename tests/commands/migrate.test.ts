import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { migrateCommand } from '../../src/commands/migrate.js'

const testRepo = join(tmpdir(), 'lc-migrate-test-' + Date.now())

function createFlatProblem(
  repoPath: string,
  dirName: string,
  difficulty: string,
  ext: string = '.py'
): void {
  const dirPath = join(repoPath, dirName)
  mkdirSync(dirPath, { recursive: true })
  const header = `# Difficulty: ${difficulty}\n# some other metadata\n`
  writeFileSync(join(dirPath, `solution${ext}`), header + 'def solve(): pass\n')
}

describe('migrateCommand', () => {
  beforeEach(() => {
    mkdirSync(testRepo, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testRepo)) rmSync(testRepo, { recursive: true })
  })

  it('moves Easy problem to Easy/ subdirectory', async () => {
    createFlatProblem(testRepo, '0001-two-sum', 'Easy')
    await migrateCommand(testRepo, { dryRun: false })
    expect(existsSync(join(testRepo, 'Easy', '0001-two-sum', 'solution.py'))).toBe(true)
    expect(existsSync(join(testRepo, '0001-two-sum'))).toBe(false)
  })

  it('moves Medium problem to Medium/ subdirectory', async () => {
    createFlatProblem(testRepo, '0015-3sum', 'Medium')
    await migrateCommand(testRepo, { dryRun: false })
    expect(existsSync(join(testRepo, 'Medium', '0015-3sum', 'solution.py'))).toBe(true)
    expect(existsSync(join(testRepo, '0015-3sum'))).toBe(false)
  })

  it('moves Hard problem to Hard/ subdirectory', async () => {
    createFlatProblem(testRepo, '0042-trapping-rain-water', 'Hard')
    await migrateCommand(testRepo, { dryRun: false })
    expect(existsSync(join(testRepo, 'Hard', '0042-trapping-rain-water', 'solution.py'))).toBe(true)
    expect(existsSync(join(testRepo, '0042-trapping-rain-water'))).toBe(false)
  })

  it('dry-run does not move files', async () => {
    createFlatProblem(testRepo, '0001-two-sum', 'Easy')
    const result = await migrateCommand(testRepo, { dryRun: true })
    expect(existsSync(join(testRepo, '0001-two-sum'))).toBe(true)
    expect(existsSync(join(testRepo, 'Easy', '0001-two-sum'))).toBe(false)
    expect(result.planned.length).toBeGreaterThan(0)
  })

  it('skips directories already in difficulty structure', async () => {
    mkdirSync(join(testRepo, 'Easy', '0001-two-sum'), { recursive: true })
    writeFileSync(join(testRepo, 'Easy', '0001-two-sum', 'solution.py'), '# Difficulty: Easy\n')
    const result = await migrateCommand(testRepo, { dryRun: false })
    expect(result.skipped.length).toBe(0)
    expect(result.moved.length).toBe(0)
  })

  it('skips non-problem directories (no NNNN- prefix)', async () => {
    mkdirSync(join(testRepo, 'some-notes'), { recursive: true })
    const result = await migrateCommand(testRepo, { dryRun: false })
    expect(result.skipped.length).toBe(0)
    expect(result.moved.length).toBe(0)
  })

  it('skips problem when no solution file found', async () => {
    mkdirSync(join(testRepo, '0001-two-sum'), { recursive: true })
    const result = await migrateCommand(testRepo, { dryRun: false })
    expect(result.skipped.length).toBe(1)
    expect(existsSync(join(testRepo, '0001-two-sum'))).toBe(true)
  })

  it('skips problem when difficulty cannot be parsed from header', async () => {
    mkdirSync(join(testRepo, '0001-two-sum'), { recursive: true })
    writeFileSync(join(testRepo, '0001-two-sum', 'solution.py'), 'def solve(): pass\n')
    const result = await migrateCommand(testRepo, { dryRun: false })
    expect(result.skipped.length).toBe(1)
    expect(existsSync(join(testRepo, '0001-two-sum'))).toBe(true)
  })

  it('handles multi-language solution file (JS)', async () => {
    createFlatProblem(testRepo, '0001-two-sum', 'Easy', '.js')
    await migrateCommand(testRepo, { dryRun: false })
    expect(existsSync(join(testRepo, 'Easy', '0001-two-sum', 'solution.js'))).toBe(true)
  })

  it('returns summary with moved and skipped counts', async () => {
    createFlatProblem(testRepo, '0001-two-sum', 'Easy')
    createFlatProblem(testRepo, '0015-3sum', 'Medium')
    mkdirSync(join(testRepo, '0042-no-solution'), { recursive: true })

    const result = await migrateCommand(testRepo, { dryRun: false })
    expect(result.moved.length).toBe(2)
    expect(result.skipped.length).toBe(1)
  })
})
