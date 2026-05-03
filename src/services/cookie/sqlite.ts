import { copyFileSync, mkdtempSync, rmSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

export interface RawCookieRow {
  host_key: string
  name: string
  value: string
  encrypted_value: Buffer
  expires_utc: number
}

export interface FirefoxCookieRow {
  host: string
  name: string
  value: string
  expiry: number
}

export type CookieDbReader = (dbPath: string, host: string, name: string) => Promise<RawCookieRow | null>
export type FirefoxDbReader = (dbPath: string, host: string, name: string) => Promise<FirefoxCookieRow | null>

let cachedSqlite: typeof import('better-sqlite3') | null = null
let sqliteLoadFailed = false

async function loadSqlite(): Promise<typeof import('better-sqlite3') | null> {
  if (sqliteLoadFailed) return null
  if (cachedSqlite) return cachedSqlite
  try {
    const mod = (await import('better-sqlite3')) as unknown as {
      default: typeof import('better-sqlite3')
    }
    cachedSqlite = mod.default
    return cachedSqlite
  } catch {
    sqliteLoadFailed = true
    return null
  }
}

function withCopiedDb<T>(dbPath: string, fn: (copyPath: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), 'lcp-cookie-'))
  const copy = join(dir, 'cookies.db')
  try {
    copyFileSync(dbPath, copy)
    return fn(copy)
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true })
    } catch {
      // best effort
    }
  }
}

export const realChromiumCookieReader: CookieDbReader = async (dbPath, host, name) => {
  if (!existsSync(dbPath)) return null
  const Sqlite = await loadSqlite()
  if (!Sqlite) throw new Error('native_module_missing')

  return withCopiedDb(dbPath, (copyPath) => {
    const db = new Sqlite(copyPath, { readonly: true, fileMustExist: true })
    try {
      const stmt = db.prepare(
        'SELECT host_key, name, value, encrypted_value, expires_utc FROM cookies WHERE (host_key = ? OR host_key = ?) AND name = ? ORDER BY expires_utc DESC LIMIT 1'
      )
      const row = stmt.get(host, `.${host}`, name) as RawCookieRow | undefined
      if (!row) return null
      return {
        host_key: row.host_key,
        name: row.name,
        value: row.value,
        encrypted_value: Buffer.from(row.encrypted_value),
        expires_utc: row.expires_utc,
      }
    } finally {
      db.close()
    }
  })
}

export const realFirefoxCookieReader: FirefoxDbReader = async (dbPath, host, name) => {
  if (!existsSync(dbPath)) return null
  const Sqlite = await loadSqlite()
  if (!Sqlite) throw new Error('native_module_missing')

  return withCopiedDb(dbPath, (copyPath) => {
    const db = new Sqlite(copyPath, { readonly: true, fileMustExist: true })
    try {
      const stmt = db.prepare(
        'SELECT host, name, value, expiry FROM moz_cookies WHERE (host = ? OR host = ?) AND name = ? ORDER BY expiry DESC LIMIT 1'
      )
      const row = stmt.get(host, `.${host}`, name) as FirefoxCookieRow | undefined
      return row ?? null
    } finally {
      db.close()
    }
  })
}
