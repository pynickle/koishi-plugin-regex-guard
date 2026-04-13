# SRC KNOWLEDGE BASE

## OVERVIEW

`src/` is the server-side Koishi plugin: schema/config, pure rule engine, command handlers, runtime middleware, console backend APIs, services, locales, and shared contracts.

## STRUCTURE

```text
src/
├── core/      # pure engine + admin commands
├── runtime/   # interception and action execution
├── services/  # DB-backed and in-memory services injected onto ctx
├── console/   # console event listeners
├── config/    # Koishi schema/config types
├── types/     # shared contracts reused by client and scripts
└── locales/   # active zh-CN locale data + localization helpers
```

## WHERE TO LOOK

| Task                                       | Location                                       | Notes                               |
| ------------------------------------------ | ---------------------------------------------- | ----------------------------------- |
| Add/change plugin bootstrap                | `index.ts`                                     | Wires everything together           |
| Adjust matching, probability, placeholders | `core/engine.ts`                               | Keep pure and testable              |
| Add admin commands                         | `core/command/index.ts`                        | Must stay under `rguard.*`          |
| Change admin gate                          | `core/command/admin-guard.ts`                  | Shared permission check             |
| Change middleware side effects             | `runtime/middleware.ts`, `runtime/executor.ts` | Preserve recall → reply → mute flow |
| Change persistence/import/export           | `services/`                                    | Only service layer touches DB       |
| Add console backend events                 | `console/api.ts`                               | Return `{ success, data?, error? }` |
| Change data model                          | `types/index.ts` + `index.ts` model extend     | Update both runtime and schema      |

## CONVENTIONS

- `src/` uses semicolon-terminated, 4-space-indented TypeScript; follow existing file style instead of client style.
- Even with root TS strict mode off, keep public types explicit and avoid widening through `any`.
- Commands return localized text via `session.text(...)`; console backend returns structured objects.
- Broadcast rule/debug updates after mutations so client composables refresh automatically.
- `ctx.ruleService.listRules(ctx, { enabled: true })` style service calls are the normal read path for runtime code.

## ANTI-PATTERNS

- No direct `ctx.database` access in `core/` or `console/`.
- No unlocalized operator-facing strings.
- No behavior split between command path and console path unless the difference is intentional and documented.
- Do not move client concerns into `src/`; `src/console/api.ts` is an event bridge, not a Vue-aware layer.

## VERIFICATION

```bash
pnpm run build
node scripts/verify-engine.mjs
node scripts/verify-service.mjs
node scripts/verify-runtime.mjs
node scripts/verify-commands.mjs
node scripts/verify-console-api.mjs
node scripts/verify-integration.mjs
```

## NOTES

- `src/locales/zh-CN.json` is the live locale file for commands/UI text; treat mentions of `src/config/locales/` as historical drift unless that directory is reintroduced.
- `types/index.ts` is a shared contract file consumed by both `client/` and verification scripts; schema changes ripple outward quickly.
