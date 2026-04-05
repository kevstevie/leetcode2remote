import { describe, it, expect } from 'vitest'
import { getFileExtension, getLanguageDisplayName } from '../../src/utils/language-map.js'

describe('getFileExtension', () => {
  it.each([
    ['python3', '.py'],
    ['python', '.py'],
    ['cpp', '.cpp'],
    ['java', '.java'],
    ['javascript', '.js'],
    ['typescript', '.ts'],
    ['golang', '.go'],
    ['rust', '.rs'],
    ['kotlin', '.kt'],
    ['swift', '.swift'],
    ['csharp', '.cs'],
    ['ruby', '.rb'],
    ['scala', '.scala'],
    ['mysql', '.sql'],
    ['bash', '.sh'],
    ['c', '.c'],
    ['dart', '.dart'],
  ])('returns %s → %s', (lang, expected) => {
    expect(getFileExtension(lang)).toBe(expected)
  })

  it('falls back to .langname for unknown language', () => {
    expect(getFileExtension('haskell')).toBe('.haskell')
  })
})

describe('getLanguageDisplayName', () => {
  it('returns human-readable names', () => {
    expect(getLanguageDisplayName('python3')).toBe('Python3')
    expect(getLanguageDisplayName('cpp')).toBe('C++')
    expect(getLanguageDisplayName('csharp')).toBe('C#')
    expect(getLanguageDisplayName('golang')).toBe('Go')
    expect(getLanguageDisplayName('javascript')).toBe('JavaScript')
  })

  it('returns raw lang name for unknown', () => {
    expect(getLanguageDisplayName('brainfuck')).toBe('brainfuck')
  })
})
