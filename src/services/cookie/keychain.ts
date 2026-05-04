import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export type KeychainReader = (serviceName: string) => Promise<string>

export const realKeychainReader: KeychainReader = async (serviceName) => {
  const { stdout } = await execFileAsync('security', [
    'find-generic-password',
    '-w',
    '-s',
    serviceName,
  ])
  const password = stdout.trim()
  if (!password) {
    throw new Error('keychain_empty')
  }
  return password
}
