# Regex Guard Plugin - Agent Guidelines

## Project Overview

This is a Koishi plugin for regex-based message moderation in group chats. It provides database-backed rules, admin commands, and a custom console extension page for rule management.

## Architecture

```
src/
├── index.ts              # Plugin entry, table declarations, service registration
├── config/
│   ├── config.ts         # Koishi schema and Config interface
│   └── locales/
│       └── zh-CN.json    # Config panel i18n labels
├── core/
│   ├── engine.ts         # Pure rule engine (validation, matching, selection)
│   ├── command/
│   │   ├── index.ts      # Command handlers (rguard.*)
│   │   └── admin-guard.ts # Admin permission check
│   └── index.ts          # Core exports
├── runtime/
│   ├── middleware.ts     # Message interception middleware
│   ├── executor.ts       # Action executor (recall/reply/mute)
│   └── index.ts          # Runtime exports
├── services/
│   ├── rule-service.ts   # CRUD operations for rules
│   ├── import-export.ts  # Import/export logic
│   ├── debug-log.ts      # In-memory debug log service
│   └── index.ts          # Service exports
├── console/
│   ├── api.ts            # Console backend API handlers
│   └── index.ts          # Console exports
├── types/
│   └── index.ts          # Shared TypeScript types
└── locales/
    └── zh-CN.json        # Command and UI i18n strings

client/                     # Koishi console extension
├── index.ts               # Client entry
├── page.vue               # Main console page
├── tsconfig.json          # Client-side TypeScript config
├── composables/           # Vue composables
│   ├── useRules.ts
│   └── useDebugLog.ts
└── components/            # Vue components
    ├── RuleList.vue
    ├── RuleEditor.vue
    ├── TestMatch.vue
    ├── ImportExport.vue
    └── DebugLog.vue
```

## Key Conventions

### Code Style
- **TypeScript**: Use strict types where possible, avoid `any`
- **Formatting**: Oxfmt with 4-space indent, single quotes, trailing commas (es5)
- **Linting**: Oxlint with correctness checks enabled
- **No `any` casts**: Use proper typing; avoid `as any`
- **No `@ts-ignore`**: Fix type issues instead of suppressing them
- **No `console.log`**: Use the Logger from Koishi for debug output

### Performance Guidelines

**⚠️ IMPORTANT: Avoid LSP on Large Folders**
- Do NOT run `lsp_diagnostics` on the entire `src/` directory at once
- This causes excessive token usage and long processing times
- Instead, target specific files or small subdirectories:
  - ✅ `lsp_diagnostics(filePath="src/core/engine.ts")`
  - ✅ `lsp_diagnostics(filePath="src/services")` (small subdir)
  - ❌ `lsp_diagnostics(filePath=".")` (entire project)
  - ❌ `lsp_diagnostics(filePath="src")` (large folder)

### Service Layer Pattern
- All DB operations go through service classes (`RuleService`, `DebugLogService`)
- Services are provided on the context: `ctx.ruleService`, `ctx.debugLog`
- Never access `ctx.database` directly from commands or console APIs

### Localization
- All user-facing strings must be localized
- Command messages: `session.text('commands.rguard.messages.key')`
- Console UI: Use locale keys from `src/locales/zh-CN.json`
- Config labels: Use `src/config/locales/zh-CN.json`

### Command Pattern
- All commands under `rguard` namespace
- Admin-only: Check `cfg.adminIds.includes(session.userId)`
- Use service layer for all mutations
- Return localized strings via `session.text()`

### Console API Pattern
- Use `ctx.console.addListener()` for server-side handlers
- Return structured responses: `{ success: boolean, data?: T, error?: string }`
- Check admin permission via client user ID
- Broadcast updates: `ctx.console.broadcast('regex-guard:rules-updated', payload)`

### Vue Client Pattern
- Use Vue 3 Composition API with `<script setup>`
- TypeScript throughout
- Use Koishi console components: `k-tabs`, `k-table`, `k-form`, `k-input`, etc.
- Composables for data fetching: `useRules()`, `useDebugLog()`

## Data Model

### RegexGuardRule (Database Table)
```typescript
interface RegexGuardRule {
  id: number;                    // Auto-increment primary key
  enabled: boolean;              // Rule active state
  priority: number;              // Higher = more important
  pattern: string;               // Regex source
  flags: string;                 // Regex flags (e.g., 'gi')
  targetGroupIds: string[];      // Empty = all groups
  extraWhitelistUserIds: string[]; // Exempt users
  adminExempt: boolean;          // Admins bypass this rule
  recallEnabled: boolean;        // Delete message
  replyTemplate: string;         // Reply content with placeholders
  muteDuration: number;          // Seconds (0 = no mute)
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}
```

### Placeholders in replyTemplate
- `{nickname}` - User's nickname
- `{match}` - Full regex match
- `{group1}` to `{group9}` - Capture groups

## Action Execution Order

Rules are evaluated in this order:
1. **Filter**: enabled, target groups, whitelist, admin exemption
2. **Match**: Test regex against message content
3. **Select**: Highest priority rule (random tie-break)
4. **Execute**: recall → reply → mute (continue on failure)

## Debug Logging

Debug events are stored in-memory (not persisted to DB):
- `match` - Rule tested against message
- `selection` - Rule selected for action
- `action_success` - Action executed successfully
- `action_failure` - Action failed
- `test_match` - Test match via console/command
- `import` / `export` - Import/export operations

## Common Tasks

### Adding a New Command
1. Add handler in `src/core/command/index.ts`
2. Add locale strings in `src/locales/zh-CN.json`
3. Register in `registerCommands()` function

### Adding a Console API
1. Add listener in `src/console/api.ts`
2. Update `ConsoleApiMethods` interface
3. Broadcast updates if needed

### Modifying Rule Schema
1. Update `RegexGuardRule` interface in `src/types/index.ts`
2. Update table definition in `src/index.ts` `ctx.model.extend()`
3. Update `RegexGuardRuleInput` interface
4. Update `RuleService.normalizeInput()`
5. Update locale strings

## Testing

Run verification scripts:
```bash
node scripts/verify-engine.mjs        # Test rule engine
node scripts/verify-debug-log.mjs     # Test debug service
node scripts/verify-runtime.mjs         # Test middleware/executor
node scripts/verify-service.mjs         # Test CRUD operations
node scripts/verify-commands.mjs        # Test admin commands
node scripts/verify-console-api.mjs     # Test console APIs
node scripts/verify-integration.mjs     # Test command/console consistency
```

## Build & Release

```bash
pnpm run lint      # Check with oxlint
pnpm run lint:fix  # Auto-fix lint issues
pnpm run fmt       # Format with oxfmt
pnpm run build     # Build with esbuild + tsc
```

## Anti-Patterns to Avoid

1. **Don't use `any`**: Use proper types or `unknown` with type guards
2. **Don't use `@ts-ignore`**: Fix the underlying type issue
3. **Don't use `console.log`**: Use Koishi's Logger
4. **Don't access DB directly**: Use service layer
5. **Don't skip admin checks**: All management operations require admin
6. **Don't use LSP on large folders**: Target specific files instead

## References

- Koishi Docs: https://koishi.chat/
- Console Extension: https://koishi.chat/zh-CN/guide/console/
- Middleware: https://koishi.chat/zh-CN/guide/basic/middleware.html
