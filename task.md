# VPL Season 2 - Development Tasks

## Done / Implemented
- [x] Add Supabase client (`src/lib/supabase.ts`)
- [x] Update `src/lib/data.ts` to accept `season` and switch between Prisma (S1) and Supabase (S2)
- [x] Add Supabase queries for `fetchTeams`, `fetchSquads`, and `fetchFixtures`
- [x] Upgrade Standings calculations to support 3-group IPL style system (Groups A, B, C)
- [x] Pre-populate points page teams for 100% group visibility on-site prior to match resolution
- [x] Implement mathematical qualification simulator in Points Client (Gold 'Q' badges)
- [x] Add `isFunMatch` (exhibition match) bypass across scoring, standings, and stats logic
- [x] Implement dynamic Scorer Manual Player Entry for `isFunMatch` fixtures
- [x] Implement Admin controls: Schedule Auto-Gen and Wipe (delete all) fixtures
- [x] Namespace Redis key structures to `s2:` for absolute archive isolation
- [x] Update package.json to include `@supabase/supabase-js`
- [x] Add Supabase environment variable placeholders
- [x] Inject premium glassmorphism custom scrollbars and UI styling
- [x] Resolve all TypeScript type compilation errors (full build compilability)

## In-Progress / Pending Verification
- [/] Commit and push working changes to `season-2-preview` branch
- [ ] Verify point standings and qualifiers work flawlessly with dynamic mock/real data
- [ ] Verify live/completed match scorecard flows and sync through the namespaced `s2:` Redis engine
- [ ] Test the `MANUAL_ENTRY` scorer workflow during a simulated fun match
- [ ] Deploy and verify preview on Vercel (sub-domain mapping check)
