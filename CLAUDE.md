# CLAUDE.md

Project-specific instructions for Claude Code working in this repository.

## Project Overview

`leetcode-commit` (CLI: `leetcode-commit`, `lcp`) is a TypeScript CLI that fetches the latest Accepted LeetCode submission for a given problem number and commits & pushes it to a local Git repository. It is designed to be invoked programmatically from LLM tools (e.g., Claude Code).

- Entry point: `src/index.ts`
- Build output: `dist/` (via `tsup`)
- Installed globally through `npm link` → exposes `leetcode-commit` and `lcp` commands
- User config: `~/.leetcode-commit/config.json`

## Directory Layout

```
src/
├── commands/   # CLI subcommands (init, submit, migrate, config)
├── config/     # Config loader + zod schema
├── services/   # External integrations (leetcode API, git, file I/O)
├── types/      # Shared TypeScript types
├── utils/      # Logger, language map, constants
└── index.ts    # Commander entry point
```

Tests live under `tests/` and mirror the `src/` layout. Vitest is the test runner.

## Common Commands

```bash
npm install           # install deps
npm run dev -- <cmd>  # run via tsx without building
npm run build         # compile to dist/ (required for the linked CLI)
npm test              # run vitest
npm run test:coverage # run vitest with coverage
npm run lint          # tsc --noEmit
```

## Workflow: Adding a New Feature

When you add or change a feature, follow this exact sequence:

1. **Implement + test** — write tests first (vitest), then implement until green.
2. **Commit** — use Conventional Commits (`feat:`, `fix:`, `refactor:`, etc.). Do not add co-author trailers (attribution is disabled globally).
3. **Re-run locally** — rebuild so the globally linked `leetcode-commit` / `lcp` binary reflects the change:

   ```bash
   npm run build
   ```

   If the CLI was installed via `npm link` (or `npm install -g .`), `npm run build` alone is enough because the bin points at `dist/index.js`. If it was installed from the registry, also run `npm link` once after the first build.

4. **Smoke test the CLI** — invoke the new behavior through the real binary, not just `npm run dev`, to catch build/link regressions:

   ```bash
   lcp <subcommand> ...
   ```

5. **Push** — only after the local run confirms the feature works end-to-end.

This "commit → rebuild → run locally" loop is mandatory for every new feature so the installed CLI never lags behind the source.

## Coding Conventions

- **Immutability**: never mutate objects; return new ones (spread / structured copies).
- **Small files**: 200–400 lines typical, 800 max. Split by feature/domain.
- **Validation at boundaries**: user input and external API responses go through `zod` schemas (see `src/config/schema.ts`).
- **Errors**: wrap risky calls in try/catch, log with context, rethrow a user-friendly message. All diagnostics go to stderr; exit codes convey success/failure.
- **No `console.log`**: use the logger in `src/utils/logger.ts`.
- **No hardcoded secrets**: session cookies live in `~/.leetcode-commit/config.json`, never in source.

## Testing Requirements

- Target **80%+ coverage** across unit and integration tests.
- TDD: red → green → refactor.
- Mock network calls to LeetCode; do not hit the real API from tests.
- Git operations should be tested against a temp repo, not the user's actual repo.

## Git & Commits

- Conventional Commits format: `<type>: <description>`.
- Types in use here: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`.
- Do **not** include Claude attribution / co-author trailers.
- Never `git push --force` or `git reset --hard` without explicit user approval.
- **After every commit that touches `src/`, run `npm run build`** so the globally linked `leetcode-commit` / `lcp` binary picks up the change. The bin points at `dist/index.js`, so without rebuilding the installed CLI silently runs the old code. Skip only for `docs:` / test-only commits that do not change runtime behavior.

## Security Checklist (before every commit)

- [ ] No hardcoded cookies, tokens, or repo paths
- [ ] New external input is validated with `zod`
- [ ] Git operations cannot escape the configured `repoPath`
- [ ] Error messages don't leak the session cookie or file contents
