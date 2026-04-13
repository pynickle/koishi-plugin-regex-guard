# CLIENT KNOWLEDGE BASE

## OVERVIEW
`client/` is the Koishi console extension: a Vue 3 page, tabbed management UI, composables around `@koishijs/client`, and shared typing imported from `../src`.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Extension registration and route | `index.ts` | Registers `/regex-guard` page |
| Overall dashboard shell and styling | `page.vue` | Tabs, editor flow, global CSS tokens |
| Rule list/edit/test/import/debug panels | `components/*.vue` | One feature per component |
| Console event consumers | `composables/useRules.ts`, `useDebugLog.ts` | `send(...)` and `receive(...)` live here |
| Client i18n helper | `i18n.ts` | UI string lookup entry |

## CONVENTIONS
- `client/tsconfig.json` is strict; keep types accurate instead of leaning on runtime coercion.
- Existing client code uses no semicolons and 2-space indentation; match local style inside this subtree.
- Shared types come from `../../src` or `../src/types/index`; keep imports type-only where possible.
- Data refresh is event-driven: `receive('regex-guard:rules-updated', ...)` and `receive('regex-guard:debug-entries-updated', ...)` should stay the default sync path.
- `page.vue` owns layout/state transitions; feature components should stay focused on one panel.

## ANTI-PATTERNS
- Do not duplicate backend validation in multiple components; push shared fetch/mutation logic into composables.
- Do not hardcode operator text; route through `t(...)`.
- Do not silently ignore failed `send(...)` calls without surfacing an error state.
- Do not import server-only runtime modules into the client; only shared types/contracts cross the boundary.

## VERIFICATION
```bash
pnpm run build
```

## NOTES
- The UI is bundled through `koishi-console build .`, not a separate Vite script.
- `page.vue` holds substantial global CSS and acts like the design system source for child components; style changes usually belong there first.
