import { z } from 'zod'

export const configSchema = z.object({
  leetcode: z.object({
    sessionCookie: z.string().min(1, 'LeetCode session cookie is required'),
    csrfToken: z.string().optional(),
  }),
  github: z.object({
    repoPath: z.string().min(1, 'GitHub repository path is required'),
  }),
})

export type Config = z.infer<typeof configSchema>
