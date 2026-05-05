import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join, relative, isAbsolute } from 'path'
import { z } from 'zod'
import { getFileExtension, getLanguageDisplayName } from '../utils/language-map.js'
import type { ProblemInfo, SubmissionDetail } from '../types/index.js'

const safeProblemSchema = z.object({
  frontendQuestionId: z.string().regex(/^\d+$/, 'frontendQuestionId must be digits only'),
  titleSlug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'titleSlug must match /^[a-z0-9-]+$/'),
  difficulty: z.enum(['Easy', 'Medium', 'Hard'], {
    errorMap: () => ({ message: 'difficulty must be Easy, Medium, or Hard' }),
  }),
})

function buildDirName(problem: ProblemInfo): string {
  const paddedId = problem.frontendQuestionId.padStart(4, '0')
  const slug = problem.titleSlug
  return `${paddedId}-${slug}`
}

function buildHeader(problem: ProblemInfo, detail: SubmissionDetail): string {
  const lang = detail.lang.name
  const url = `https://leetcode.com/problems/${problem.titleSlug}/`
  const date = new Date(parseInt(detail.timestamp) * 1000).toISOString().split('T')[0]

  const commentStyles: Record<string, { single?: string; multi?: [string, string, string] }> = {
    python3: { single: '#' },
    python: { single: '#' },
    ruby: { single: '#' },
    bash: { single: '#' },
    r: { single: '#' },
    javascript: { multi: ['/**', ' *', ' */'] },
    typescript: { multi: ['/**', ' *', ' */'] },
    java: { multi: ['/**', ' *', ' */'] },
    cpp: { multi: ['/**', ' *', ' */'] },
    c: { multi: ['/**', ' *', ' */'] },
    csharp: { multi: ['/**', ' *', ' */'] },
    kotlin: { multi: ['/**', ' *', ' */'] },
    swift: { multi: ['/**', ' *', ' */'] },
    scala: { multi: ['/**', ' *', ' */'] },
    rust: { multi: ['/**', ' *', ' */'] },
    golang: { multi: ['/**', ' *', ' */'] },
    dart: { multi: ['/**', ' *', ' */'] },
  }

  const style = commentStyles[lang.toLowerCase()] ?? { multi: ['/**', ' *', ' */'] }

  const lines = [
    `Problem: #${problem.frontendQuestionId} - ${problem.title}`,
    `Difficulty: ${problem.difficulty}`,
    `Language: ${getLanguageDisplayName(lang)}`,
    `URL: ${url}`,
    `Submitted: ${date}`,
  ]

  if (problem.topicTags.length > 0) {
    lines.push(`Tags: ${problem.topicTags.join(', ')}`)
  }

  if (style.multi) {
    const [open, prefix, close] = style.multi
    return [open, ...lines.map((l) => `${prefix} ${l}`), close, ''].join('\n')
  } else {
    return [...lines.map((l) => `${style.single} ${l}`), ''].join('\n')
  }
}

export interface SaveResult {
  filePath: string
  dirPath: string
  isNew: boolean
  isDuplicate: boolean
}

export function saveSubmission(
  repoPath: string,
  problem: ProblemInfo,
  detail: SubmissionDetail
): SaveResult {
  const parsed = safeProblemSchema.safeParse(problem)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    throw new Error(`Invalid problem metadata: ${issue.path.join('.')}: ${issue.message}`)
  }

  const dirName = buildDirName(problem)
  const ext = getFileExtension(detail.lang.name)
  const dirPath = join(repoPath, problem.difficulty, dirName)
  const filePath = join(dirPath, `solution${ext}`)

  const rel = relative(repoPath, filePath)
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`Refusing to write outside repoPath: ${filePath}`)
  }

  const header = buildHeader(problem, detail)
  const code = detail.code.endsWith('\n') ? detail.code : detail.code + '\n'
  const content = header + code

  const isNew = !existsSync(filePath)
  let isDuplicate = false

  if (!isNew) {
    const existing = readFileSync(filePath, 'utf-8')
    if (existing === content) {
      isDuplicate = true
      return { filePath, dirPath, isNew: false, isDuplicate: true }
    }
  }

  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true })
  }

  writeFileSync(filePath, content, 'utf-8')

  return { filePath, dirPath, isNew, isDuplicate }
}
