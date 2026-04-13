# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-12 23:13:59 +08:00
**Commit:** f5fb071
**Branch:** master

## OVERVIEW
Koishi plugin for regex-based group moderation with two operator surfaces: `src/` handles rule evaluation, persistence, commands, middleware, and console APIs; `client/` provides the Koishi console UI used to manage and test rules.

## STRUCTURE
```text
./
├── src/        # Koishi plugin runtime, services, commands, console backend
├── client/     # Vue console extension bundled by koishi-console
├── scripts/    # node-based verification scripts against built lib/index.cjs
├── dist/       # console build output
├── lib/        # bundled plugin output + declarations
└── .agents/    # local agent skills; not part of plugin runtime
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Plugin wiring, model, extension registration | `src/index.ts` | Main entry; registers services, DB table, middleware, commands, console page |
| Rule engine and selection behavior | `src/core/engine.ts` | Pure matching + action planning logic |
| Admin commands | `src/core/command/index.ts` | `rguard.*` namespace only |
| Runtime interception and action execution | `src/runtime/` | Middleware filters + executor side effects |
| CRUD, import/export, debug log services | `src/services/` | Only approved DB access layer |
| Console backend events | `src/console/api.ts` | `ctx.console.addListener()` handlers |
| Shared types | `src/types/index.ts` | Rule, import/export, debug, evaluation contracts |
| Console frontend | `client/` | Vue 3 + Koishi client APIs |
| Verification harness | `scripts/` | Runs against built artifacts, not raw TS source |

## CODE MAP
| Symbol | Type | Location | Role |
|--------|------|----------|------|
| `apply` | function | `src/index.ts` | Plugin bootstrap and dependency wiring |
| `registerCommands` | function | `src/core/command/index.ts` | Admin command registration |
| `registerConsoleApi` | function | `src/console/api.ts` | Console event bridge |
| `registerMiddleware` | function | `src/runtime/middleware.ts` | Message interception entry |
| `provideRuleServices` | function | `src/services/index.ts` | Context service injection |
| `RegexGuardRule` | interface | `src/types/index.ts` | Persistent rule schema |

## CONVENTIONS
- Formatting is authoritative from `.oxfmtrc.json`: 4 spaces, single quotes, trailing commas `es5`; JSON excluded from oxfmt.
- Root `tsconfig.json` has `strict: false`, but project guidance still expects explicit types and no `any` shortcuts.
- Client code is stricter than server code: `client/tsconfig.json` enables `strict: true`.
- User-facing text stays localized. Commands use `session.text(...)`; console UI uses locale keys and shared i18n helpers.
- Database access belongs in service classes on `ctx` (`ctx.ruleService`, `ctx.ruleImportExportService`, `ctx.debugLog`), never directly inside commands or console handlers.
- `src/locales/zh-CN.json` is the active command/UI locale file. Existing older guidance mentioning `src/config/locales/` is stale for this repo state.

## ANTI-PATTERNS (THIS PROJECT)
- No `any`, `as any`, `@ts-ignore`, or `console.log` in maintained source.
- Do not bypass admin checks for `rguard.*` commands or console management events.
- Do not access `ctx.database` from commands or console APIs; keep mutations inside services.
- Avoid broad LSP diagnostics on all of `src/`; inspect specific files or small subdirectories.
- Do not assume documented scripts/config paths are current without checking the repo; this project already contains some stale guidance drift.

## UNIQUE STYLES
- Build output is split: `koishi-console build .` produces the UI bundle, then `node esbuild.config.js` bundles `src/index.ts` to `lib/index.cjs`, then `tsc --emitDeclarationOnly` emits types.
- Verification is custom and build-dependent. `scripts/verify-*.mjs` import `../lib/index.cjs`, so `pnpm run build` must precede script execution.
- `src/index.ts` extends both Koishi tables and console event typings inline; schema and event surfaces are centralized there.

## COMMANDS
```bash
pnpm run lint
pnpm run lint:fix
pnpm run fmt
pnpm run build
node scripts/verify-engine.mjs
node scripts/verify-debug-log.mjs
node scripts/verify-runtime.mjs
node scripts/verify-service.mjs
node scripts/verify-commands.mjs
node scripts/verify-console-api.mjs
node scripts/verify-integration.mjs
```

## NOTES
- Release automation lives in `.github/workflows/release.yml` and runs install → audit signatures → build → semantic-release; it does not run lint or verification scripts.
- `scripts/` is now real and should be treated as maintained infrastructure, not as aspirational docs.
- Child guidance exists for `src/`, `client/`, and `scripts/`; prefer the closest file before applying root-level rules.
