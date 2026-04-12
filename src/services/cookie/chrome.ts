import { execFileSync } from 'child_process'
import { pbkdf2Sync, createDecipheriv } from 'crypto'
import Database from 'better-sqlite3'

// These constants match Chrome's macOS cookie encryption scheme (v10)
const SALT = 'saltysalt'
const ITERATIONS = 1003
const KEY_LENGTH = 16
const IV = Buffer.alloc(16, 0x20)

function getKeychainPassword(serviceName: string): string {
  try {
    const output = execFileSync('security', [
      'find-generic-password', '-w', '-s', serviceName, '-a', serviceName,
    ], { stdio: ['pipe', 'pipe', 'pipe'] })
    return output.toString().trim()
  } catch {
    throw new Error(
      `Failed to retrieve password from macOS Keychain for "${serviceName}". ` +
      'Ensure the browser has been opened at least once and Keychain access is not locked.'
    )
  }
}

function deriveKey(password: string): Buffer {
  return pbkdf2Sync(password, SALT, ITERATIONS, KEY_LENGTH, 'sha1')
}

function decryptValue(encryptedValue: Buffer, key: Buffer): string {
  const payload = encryptedValue.subarray(3) // strip 'v10' prefix
  const decipher = createDecipheriv('aes-128-cbc', key, IV)
  decipher.setAutoPadding(true)
  const decrypted = Buffer.concat([decipher.update(payload), decipher.final()])
  return decrypted.toString('utf8')
}

export function extractChromeCookie(cookiePath: string, serviceName = 'Chrome Safe Storage'): string {
  const password = getKeychainPassword(serviceName)
  const db = new Database(cookiePath, { readonly: true, fileMustExist: true })

  try {
    const row = db
      .prepare(
        `SELECT value, encrypted_value FROM cookies
         WHERE host_key LIKE ? AND name = ?
         LIMIT 1`
      )
      .get('%leetcode.com%', 'LEETCODE_SESSION') as { value: string; encrypted_value: Buffer } | undefined

    if (!row) {
      throw new Error('LEETCODE_SESSION cookie not found in Chrome database')
    }

    if (!row.encrypted_value || row.encrypted_value.length === 0) {
      return row.value
    }

    const key = deriveKey(password)
    return decryptValue(row.encrypted_value, key)
  } finally {
    db.close()
  }
}
