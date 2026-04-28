import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  generateStatsSection,
  updateReadmeContent,
  updateReadme,
  STATS_START_MARKER,
  STATS_END_MARKER,
} from '../../src/services/readme.js'
import type { RepoStats } from '../../src/services/stats.js'

const testRepo = join(tmpdir(), 'lc-readme-test-' + Date.now())

const baseStats: RepoStats = {
  total: 6,
  byDifficulty: { Easy: 3, Medium: 2, Hard: 1 },
  byTopic: { Array: 4, 'Hash Table': 2, 'Two Pointers': 1, Stack: 1 },
}

describe('generateStatsSection', () => {
  it('wraps content in start/end markers', () => {
    const out = generateStatsSection(baseStats)
    expect(out.startsWith(STATS_START_MARKER)).toBe(true)
    expect(out.endsWith(STATS_END_MARKER)).toBe(true)
  })

  it('includes total count and per-difficulty counts', () => {
    const out = generateStatsSection(baseStats)
    expect(out).toContain('6')
    expect(out).toContain('Easy')
    expect(out).toContain('Medium')
    expect(out).toContain('Hard')
  })

  it('emits a mermaid pie chart for difficulty', () => {
    const out = generateStatsSection(baseStats)
    expect(out).toContain('```mermaid')
    expect(out).toMatch(/pie\b/)
    expect(out).toContain('"Easy"')
    expect(out).toContain('"Medium"')
    expect(out).toContain('"Hard"')
  })

  it('renders topics as a markdown table with unicode bars', () => {
    const out = generateStatsSection(baseStats)
    expect(out).toMatch(/\|\s*#\s*\|\s*토픽\s*\|/)
    expect(out).toContain('Array')
    expect(out).toContain('Hash Table')
    expect(out).toContain('█')
  })

  it('orders topic rows by count desc and includes counts in the table', () => {
    const out = generateStatsSection(baseStats)
    const arrayIdx = out.indexOf('| Array |')
    const hashIdx = out.indexOf('| Hash Table |')
    expect(arrayIdx).toBeGreaterThan(-1)
    expect(hashIdx).toBeGreaterThan(arrayIdx)
    expect(out).toMatch(/\|\s*Array\s*\|\s*4\s*\|/)
  })

  it('limits topics to topN sorted by count desc', () => {
    const stats: RepoStats = {
      total: 50,
      byDifficulty: { Easy: 50, Medium: 0, Hard: 0 },
      byTopic: Object.fromEntries(
        Array.from({ length: 30 }, (_, i) => [`Tag${i}`, 30 - i])
      ),
    }
    const out = generateStatsSection(stats, 5)
    expect(out).toContain('| Tag0 |')
    expect(out).toContain('| Tag4 |')
    expect(out).not.toContain('| Tag5 |')
  })

  it('falls back to a friendly message when there are no topics', () => {
    const stats: RepoStats = {
      total: 1,
      byDifficulty: { Easy: 1, Medium: 0, Hard: 0 },
      byTopic: {},
    }
    const out = generateStatsSection(stats)
    expect(out).not.toContain('█')
    expect(out).toMatch(/태그|tag/i)
  })
})

describe('updateReadmeContent', () => {
  it('creates a new README scaffold when none exists', () => {
    const section = generateStatsSection(baseStats)
    const out = updateReadmeContent(null, section)
    expect(out).toContain('# LeetCode Solutions')
    expect(out).toContain(STATS_START_MARKER)
    expect(out).toContain(STATS_END_MARKER)
  })

  it('replaces only the content between existing markers', () => {
    const section = generateStatsSection(baseStats)
    const existing = [
      '# My Solutions',
      '',
      'Intro paragraph.',
      '',
      STATS_START_MARKER,
      'OLD STATS',
      STATS_END_MARKER,
      '',
      'Footer paragraph.',
      '',
    ].join('\n')
    const out = updateReadmeContent(existing, section)
    expect(out).toContain('# My Solutions')
    expect(out).toContain('Intro paragraph.')
    expect(out).toContain('Footer paragraph.')
    expect(out).not.toContain('OLD STATS')
    expect(out).toContain(STATS_START_MARKER)
    expect(out).toContain(STATS_END_MARKER)
  })

  it('appends section when README has no markers', () => {
    const section = generateStatsSection(baseStats)
    const existing = '# My Solutions\n\nSome content.\n'
    const out = updateReadmeContent(existing, section)
    expect(out.startsWith('# My Solutions')).toBe(true)
    expect(out).toContain('Some content.')
    expect(out).toContain(STATS_START_MARKER)
  })
})

describe('updateReadme (filesystem)', () => {
  beforeEach(() => {
    mkdirSync(testRepo, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testRepo)) rmSync(testRepo, { recursive: true })
  })

  it('writes a new README.md when missing', () => {
    const result = updateReadme(testRepo, baseStats)
    expect(result.changed).toBe(true)
    expect(existsSync(result.path)).toBe(true)
    const content = readFileSync(result.path, 'utf-8')
    expect(content).toContain(STATS_START_MARKER)
  })

  it('reports unchanged when stats section is identical', () => {
    updateReadme(testRepo, baseStats)
    const second = updateReadme(testRepo, baseStats)
    expect(second.changed).toBe(false)
  })

  it('updates only the markers when README has user content', () => {
    const path = join(testRepo, 'README.md')
    writeFileSync(
      path,
      ['# My Repo', '', 'Custom intro.', '', STATS_START_MARKER, 'old', STATS_END_MARKER, '', 'Footer.', ''].join('\n')
    )
    const result = updateReadme(testRepo, baseStats)
    expect(result.changed).toBe(true)
    const content = readFileSync(path, 'utf-8')
    expect(content).toContain('Custom intro.')
    expect(content).toContain('Footer.')
    expect(content).not.toContain('old')
  })
})
