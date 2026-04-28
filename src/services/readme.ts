import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { RepoStats } from './stats.js'

export const STATS_START_MARKER = '<!-- LEETCODE-STATS:START -->'
export const STATS_END_MARKER = '<!-- LEETCODE-STATS:END -->'

const DEFAULT_TOPIC_LIMIT = 10

interface UpdateResult {
  path: string
  changed: boolean
}

function buildDifficultyChart(byDifficulty: RepoStats['byDifficulty']): string {
  return [
    '```mermaid',
    'pie showData',
    '    title Difficulty',
    `    "Easy"   : ${byDifficulty.Easy}`,
    `    "Medium" : ${byDifficulty.Medium}`,
    `    "Hard"   : ${byDifficulty.Hard}`,
    '```',
  ].join('\n')
}

function buildTopicChart(byTopic: RepoStats['byTopic'], limit: number): string {
  const sorted = Object.entries(byTopic).sort(([, a], [, b]) => b - a).slice(0, limit)
  if (sorted.length === 0) {
    return '_아직 태그 정보가 없습니다._'
  }

  const labels = sorted.map(([tag]) => `"${tag}"`).join(', ')
  const values = sorted.map(([, count]) => count)
  const max = Math.max(...values, 1)

  return [
    '```mermaid',
    'xychart-beta',
    '    title "Top Topics"',
    `    x-axis [${labels}]`,
    `    y-axis "Count" 0 --> ${max + 1}`,
    `    bar [${values.join(', ')}]`,
    '```',
  ].join('\n')
}

export function generateStatsSection(stats: RepoStats, topicLimit: number = DEFAULT_TOPIC_LIMIT): string {
  const { byDifficulty, byTopic, total } = stats
  const summary = `**총 풀이: ${total}문제** · Easy ${byDifficulty.Easy} · Medium ${byDifficulty.Medium} · Hard ${byDifficulty.Hard}`

  return [
    STATS_START_MARKER,
    '',
    '## 📊 풀이 통계',
    '',
    summary,
    '',
    '### 난이도별 분포',
    '',
    buildDifficultyChart(byDifficulty),
    '',
    `### 토픽별 분포 (Top ${topicLimit})`,
    '',
    buildTopicChart(byTopic, topicLimit),
    '',
    STATS_END_MARKER,
  ].join('\n')
}

function buildScaffold(statsSection: string): string {
  return [
    '# LeetCode Solutions',
    '',
    'LeetCode 풀이 모음입니다. [leetcode-commit](https://github.com/kevstevie/leetcode-commit) CLI로 자동 관리됩니다.',
    '',
    statsSection,
    '',
  ].join('\n')
}

export function updateReadmeContent(existing: string | null, statsSection: string): string {
  if (existing === null) {
    return buildScaffold(statsSection)
  }

  const startIdx = existing.indexOf(STATS_START_MARKER)
  const endIdx = existing.indexOf(STATS_END_MARKER)

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = existing.slice(0, startIdx)
    const after = existing.slice(endIdx + STATS_END_MARKER.length)
    return before + statsSection + after
  }

  const trimmed = existing.replace(/\s+$/, '')
  return `${trimmed}\n\n${statsSection}\n`
}

export function updateReadme(repoPath: string, stats: RepoStats, topicLimit?: number): UpdateResult {
  const path = join(repoPath, 'README.md')
  const existing = existsSync(path) ? readFileSync(path, 'utf-8') : null
  const section = generateStatsSection(stats, topicLimit)
  const next = updateReadmeContent(existing, section)

  if (existing === next) {
    return { path, changed: false }
  }

  writeFileSync(path, next, 'utf-8')
  return { path, changed: true }
}
