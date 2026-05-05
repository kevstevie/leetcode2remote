import { existsSync, mkdirSync, openSync, closeSync, unlinkSync, readFileSync, writeFileSync, statSync } from 'fs'
import { homedir } from 'os'
import { join, dirname } from 'path'

export interface LockHandle {
  release: () => void
}

export interface AcquireOptions {
  timeoutMs?: number
  staleMs?: number
}

const DEFAULT_TIMEOUT_MS = 5000
const DEFAULT_STALE_MS = 60_000

export async function acquireLock(
  lockPath: string,
  opts: AcquireOptions = {}
): Promise<LockHandle | null> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const staleMs = opts.staleMs ?? DEFAULT_STALE_MS
  const dir = dirname(lockPath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  const start = Date.now()
  while (true) {
    const fd = tryCreate(lockPath)
    if (fd !== null) {
      writeFileSync(lockPath, String(process.pid), 'utf-8')
      closeSync(fd)
      return { release: () => safeUnlink(lockPath) }
    }
    if (isStale(lockPath, staleMs)) {
      safeUnlink(lockPath)
      continue
    }
    if (Date.now() - start >= timeoutMs) return null
    await sleep(100)
  }
}

function tryCreate(lockPath: string): number | null {
  try {
    return openSync(lockPath, 'wx')
  } catch {
    return null
  }
}

function isStale(lockPath: string, staleMs: number): boolean {
  try {
    const stat = statSync(lockPath)
    if (Date.now() - stat.mtimeMs > staleMs) return true
    const pid = parseInt(readFileSync(lockPath, 'utf-8').trim(), 10)
    if (!Number.isInteger(pid) || pid <= 0) return true
    try {
      process.kill(pid, 0)
      return false
    } catch {
      return true
    }
  } catch {
    return true
  }
}

function safeUnlink(p: string): void {
  try {
    unlinkSync(p)
  } catch {
    // best effort
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function getRefreshLockPath(): string {
  const home = homedir()
  if (!home) {
    throw new Error('Cannot resolve home directory for refresh lock')
  }
  return join(home, '.leetcode-commit', '.refresh.lock')
}
