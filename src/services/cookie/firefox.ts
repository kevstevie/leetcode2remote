import Database from 'better-sqlite3'

export function extractFirefoxCookie(cookiePath: string): string {
  const db = new Database(cookiePath, { readonly: true, fileMustExist: true })

  try {
    const row = db
      .prepare(
        `SELECT value FROM moz_cookies
         WHERE host LIKE ? AND name = ?
         LIMIT 1`
      )
      .get('%leetcode.com%', 'LEETCODE_SESSION') as { value: string } | undefined

    if (!row) {
      throw new Error('LEETCODE_SESSION cookie not found in Firefox database')
    }

    return row.value
  } finally {
    db.close()
  }
}
