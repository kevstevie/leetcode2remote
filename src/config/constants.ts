import { homedir } from 'os'
import { join } from 'path'

export const CONFIG_DIR = join(homedir(), '.leetcode-commit')
export const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

export const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql'
export const LEETCODE_BASE_URL = 'https://leetcode.com'

export const ACCEPTED_STATUS = 10
