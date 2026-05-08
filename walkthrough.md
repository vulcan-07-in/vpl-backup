# VPL Season 2 — Session Walkthrough

## What Was Built

A fully isolated **Season 2 platform** for the Varchasva Premier League, deployed at a new Vercel project on the `season-2-preview` branch. Season 1 (`main` branch → `varchasva-premier-league.vercel.app`) is untouched and remains a read-only archive.

---

## ✅ Completed

### 1. Fixed Build-Breaking Duplication (`src/lib/data.ts`)
The file had 3 full duplicate copies of every function, causing TypeScript compilation to crash with "duplicate identifier" errors. Stripped to a single clean version.

Also fixed a critical bug in `fetchSquads(2)` where players were being matched to teams by name instead of by UUID `team_id`, causing all rosters to come back empty.

---

### 2. Upgraded Tournament Engine (`src/lib/tournament.ts`)
Rewrote to support the Season 2 format:
- **3 groups** (A, B, C) instead of 2
- **New Stage types**: `Eliminator 1`, `Eliminator 2`, `Eliminator 3`, `Qualifier 1`, `Qualifier 2`, `Final`
- **`isFunMatch` flag** on `Fixture` and `LiveMatchState` — exhibition matches excluded from standings, NRR, and stats
- **`computePlayoffSeedings()`** — ranks the top 2 from each group (6 total) by NRR
- **`resolveS2Playoffs()`** — resolves the full IPL-style bracket:
  - Seed 1 vs 6 → E1, Seed 2 vs 5 → E2, Seed 3 vs 4 → E3
  - E1 winner + E2 winner → Q1; E3 winner → Q2 (vs best loser)
  - Q1 winner + Q2 winner → Final

---

### 3. Redis Namespacing (`src/lib/redis-keys.ts`)
Created a new module that enforces `s2:` prefix on all Season 2 Redis keys:
- `s2:live_match_<matchId>` — live scores
- `s2:completed_match_<matchId>` — archived completed matches
- `s2:active_live_match_id` — currently active match pointer
- `s2:vpl_mvp_state_v1`, `s2:vpl_notifications`, `s2:vpl_logs_*`

This prevents any collision with legacy S1 Redis data (`live_match_*` without prefix).

---

### 4. All API Routes Migrated to Supabase
| Route | Change |
|-------|--------|
| `api/squads/route.ts` | Rewritten: GET + all CRUD actions use Supabase |
| `api/matches/route.ts` | Rewritten: removed duplicate Prisma block, all ops use Supabase; added `isFunMatch` support in `create_match` |
| `api/admin/teams/route.ts` | Migrated from Prisma to Supabase |
| `api/live-score/route.ts` | Migrated Prisma fallback to Supabase (`liveState` column); uses `s2:` Redis keys |
| `api/mvp/route.ts` | Already used `s2:` prefix ✓ |
| `api/notify/route.ts` | Already used `s2:` prefix ✓ |
| `api/logs/route.ts` | Already used `s2:` prefix ✓ |

---

### 5. All Pages Updated to Season 2
Every server component now passes `season: 2` to data fetchers so they read from Supabase instead of Prisma:

| Page | Change |
|------|--------|
| `app/page.tsx` (Home) | `fetchTeams(2)`, `fetchFixtures(2)` |
| `app/matches/page.tsx` | `fetchTeams(2)`, `fetchFixtures(2)` |
| `app/matches/[matchId]/page.tsx` | `fetchTeams(2)`, `fetchFixtures(2)` |
| `app/points/page.tsx` | `fetchTeams(2)`, `fetchFixtures(2)`, reads `s2:live_match_*` |
| `app/live/page.tsx` | `fetchTeams(2)`, `fetchFixtures(2)` |
| `app/stats/page.tsx` | `fetchTeams(2)` |
| `app/squads/page.tsx` | `fetchSquads(2)` |
| `app/scorer/page.tsx` | `fetchTeams(2)`, `fetchFixtures(2)`, `fetchSquads(2)` |
| `components/ChampionBanner.tsx` | `fetchTeams(2)`, `fetchFixtures(2)` |

---

### 6. Points Table Rewritten (`app/points/points-client.tsx`)
Complete redesign for 3-group format:
- **3-column group tables** (A / B / C) with gold `Q` qualification badges on top-2 teams
- **Playoff Seedings section** — 6 seed cards + Eliminator matchup cards (1v6, 2v5, 3v4)
- **Live playoff bracket** — auto-resolves as match results come in

---

### 7. Supabase Credentials Added (`.env.local`)
```
SUPABASE_URL=https://dzufjnvaodzydcdtamkp.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 8. Deployed to Vercel
- Git installed via `winget`
- All 17 changed files committed to `season-2-preview` branch and pushed to GitHub
- New Vercel project `s2-varchasva-premier-league` created, pointing to the `season-2-preview` branch
- All 7 env vars added (REDIS_URL, DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_PASSWORD, SCORER_PIN, NEXT_PUBLIC_APP_ENV)
- **Live at: https://s2-varchasva-premier-league.vercel.app**

> **Note:** The URL currently shows a 404 after the project rename. A redeploy from the Vercel dashboard will fix it — go to `s2-varchasva-premier-league` → Deployments → Redeploy latest.

---

## ⏳ What's Left

### 🔴 Immediate (Blockers)

#### 1. Fix Supabase Schema
The `varchasva-s2` Supabase project needs these columns added. Run in the SQL Editor at https://supabase.com/dashboard/project/dzufjnvaodzydcdtamkp/sql/new:

```sql
-- Check your actual table name case first (Team or team, Match or match)
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Then run (adjust case to match):
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "groupId" text DEFAULT 'A';
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "isFunMatch" boolean DEFAULT false;
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "liveState" jsonb;
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'SCHEDULED';
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "scheduledTime" timestamptz;
```

#### 3. Populate S2 Data
Use the admin panel at https://s2-varchasva-premier-league.vercel.app/admin to:
- Add 12 teams (assign groupId: A, B, or C to each)
- Add players to each team
- Schedule matches (set group and stage)

---

### 🟡 Soon (Nice to Have)

#### 4. Fix S1 Archive (varchasva-s1 project)
The `varchasva-s1` Vercel project still shows NRR as 0.000 and stats page blank because it has no env vars. Add these to it:
- REDIS_URL, DATABASE_URL, ADMIN_PASSWORD, SCORER_PIN, NEXT_PUBLIC_APP_ENV
- Then redeploy

#### 5. Custom Domain
Point `s2.varchasva.in` → `s2-varchasva-premier-league.vercel.app` via your DNS provider.

---

### 🟢 Future (S2 Feature Work)

| Feature | Notes |
|---------|-------|
| Fun Matches tab in Admin | isFunMatch flag exists in code; needs admin UI tab |
| Playoff bracket visualization | Basic list exists; could be a proper bracket diagram |
| Admin: auto-populate playoff fixtures | After group stage ends, auto-generate E1/E2/E3 fixtures from seedings |
| S2 custom domain | `s2.varchasva.in` via DNS |

---

## Architecture Reference

```
main branch          → varchasva-premier-league.vercel.app  (S1, read-only)
season-1-archive     → varchasva-s1.vercel.app              (S1 archive)
season-2-preview     → s2-varchasva-premier-league.vercel.app (S2, active)
```

```
S2 Data Layer:
  Teams/Players/Matches → Supabase (dzufjnvaodzydcdtamkp)
  Live scoring state    → Redis (s2: prefix)
  S1 legacy data        → Prisma → same Supabase project (different tables)
```
