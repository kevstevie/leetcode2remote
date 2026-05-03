import { z } from 'zod'

export const browserIdSchema = z.enum(['chrome', 'firefox', 'edge', 'brave', 'arc'])

export const configSchema = z.object({
  leetcode: z.object({
    sessionCookie: z.string().min(1, 'LeetCode session cookie is required'),
    csrfToken: z.string().optional(),
    autoRefresh: z.boolean().optional(),
    interactiveRefresh: z.boolean().optional(),
    preferredBrowser: browserIdSchema.optional(),
  }),
  github: z.object({
    repoPath: z.string().min(1, 'GitHub repository path is required'),
  }),
})

export type Config = z.infer<typeof configSchema>
