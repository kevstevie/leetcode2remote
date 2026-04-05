import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { saveSubmission } from '../../src/services/file.js'
import type { ProblemInfo, SubmissionDetail } from '../../src/types/index.js'

const testRepo = join(tmpdir(), 'lc-file-test-' + Date.now())

const problem: ProblemInfo = {
  frontendQuestionId: '1',
  titleSlug: 'two-sum',
  title: 'Two Sum',
  difficulty: 'Easy',
}

const detail: SubmissionDetail = {
  code: 'def twoSum(self, nums, target):\n    return []\n',
  lang: { name: 'python3', verboseName: 'Python 3' },
  statusDisplay: 'Accepted',
  timestamp: '1700000000',
  question: { questionId: '1', titleSlug: 'two-sum', title: 'Two Sum' },
}

describe('saveSubmission', () => {
  beforeEach(() => {
    mkdirSync(testRepo, { recursive: true })
    // Create a bare git repo so git service won't complain (file service doesn't need it)
  })

  afterEach(() => {
    if (existsSync(testRepo)) rmSync(testRepo, { recursive: true })
  })

  it('creates file with correct path', () => {
    const result = saveSubmission(testRepo, problem, detail)
    expect(result.isNew).toBe(true)
    expect(result.isDuplicate).toBe(false)
    expect(existsSync(result.filePath)).toBe(true)
    expect(result.filePath).toContain('0001-two-sum')
    expect(result.filePath).toContain('solution.py')
  })

  it('includes metadata header in file', () => {
    const result = saveSubmission(testRepo, problem, detail)
    const content = readFileSync(result.filePath, 'utf-8')
    expect(content).toContain('Two Sum')
    expect(content).toContain('Easy')
    expect(content).toContain('https://leetcode.com/problems/two-sum/')
    expect(content).toContain(detail.code)
  })

  it('detects duplicate when content unchanged', () => {
    saveSubmission(testRepo, problem, detail)
    const result2 = saveSubmission(testRepo, problem, detail)
    expect(result2.isDuplicate).toBe(true)
  })

  it('overwrites file when code changes', () => {
    saveSubmission(testRepo, problem, detail)
    const newDetail = { ...detail, code: 'def twoSum(self): return [0,1]\n' }
    const result = saveSubmission(testRepo, problem, newDetail)
    expect(result.isDuplicate).toBe(false)
    const content = readFileSync(result.filePath, 'utf-8')
    expect(content).toContain('return [0,1]')
  })

  it('uses correct extension for different languages', () => {
    const jsDetail = { ...detail, lang: { name: 'javascript', verboseName: 'JavaScript' } }
    const result = saveSubmission(testRepo, problem, jsDetail)
    expect(result.filePath).toContain('solution.js')
  })

  it('uses correct extension for Go', () => {
    const goDetail = { ...detail, lang: { name: 'golang', verboseName: 'Go' } }
    const result2 = saveSubmission(testRepo, { ...problem, frontendQuestionId: '2', titleSlug: 'add-two-numbers', title: 'Add Two Numbers', difficulty: 'Medium' }, goDetail)
    expect(result2.filePath).toContain('solution.go')
  })
})
