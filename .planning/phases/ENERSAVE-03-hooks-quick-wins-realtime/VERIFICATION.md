# Phase 3 Verification — ENERSAVE-03 Hooks, Quick-Wins & Realtime

**Status:** COMPLETE (code) — live Realtime requires Supabase + auth
**Verified:** 2026-06-17

## Automated Checks

| Check | Result |
|-------|--------|
| `npm run test` | PASS — 40 tests |
| ventas/hooks `tsc` | PASS |

## Must-Haves

| Truth | Status |
|-------|--------|
| QUICK_WIN_RULES for 11 fases | VERIFIED |
| Dedup via origen_fase + tipo | VERIFIED (tests) |
| changeFase validates PIPE before persist | VERIFIED (code) |
| Quick-wins spawn after fase change | VERIFIED (code) |
| useProspectos Realtime subscription | VERIFIED (code) |
| useTareas complete/dismiss + counters | VERIFIED (code) |
| useTareas Realtime | VERIFIED (code) |
| useActividades timeline + create | VERIFIED (code) |
| useActividades Realtime | VERIFIED (code) |

## Requirements

| ID | Status |
|----|--------|
| TASK-01–04 | Delivered in quick-wins.ts |
| HOOK-01–06 | Delivered in hooks/ |

## Human Checkpoint

- Live Realtime needs migrations applied + authenticated Supabase session (RLS)
- Simulated App profiles (`usr-*`) work with anon key only if RLS policies allow

## Next

- Phase 4: wire `useProspectos` into Pipeline kanban UI
