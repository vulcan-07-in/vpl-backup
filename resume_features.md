# Varchasva Premier League (VPL) — Complete Feature List

*Full-stack tournament management platform with real-time scoring, automated analytics, and a premium spectator experience.*

---

## 1. Live Scoring Engine (scorer-client.tsx — 2,354 lines)

- Ball-by-ball live scoring dashboard for match officials
- Event-sourced state machine — entire match state is derived by replaying a `BallEvent[]` timeline
- Handles all cricket delivery types: Normal runs (0–6), Wides, No-Balls, Leg-Byes, Dead Balls
- No-Ball modal with dedicated run selection prompt (runs are attributed to batsman AND team extras)
- Wide ball handling with automatic 1-run penalty, no batsman ball counted
- Wicket workflow with multi-step modal: dismissal type → fielder/catcher selection → new batsman
- Supports all dismissal types: Bowled, Caught, Run Out, LBW, Stumped, Hit Wicket, Retired Hurt
- Fielder attribution for catches, stumpings, and run-outs stored in event log
- Last Man Standing rule — 8-player squads where the 8th player bats alone until final wicket
- Automatic innings transition detection (all out / overs completed)
- Automatic result declaration (win by runs / win by wickets / tie)
- Manual strike swap button for scorer corrections
- Instant Undo — pops last event and rebuilds entire state from timeline
- Delete any specific delivery from the timeline — state is recalculated non-destructively
- Edit any specific delivery in the timeline — state is recalculated after modification
- Manual override system — forcefully set team runs, wickets, overs, individual batsman/bowler stats
- Dead Ball recording — logs event in timeline without affecting score or overs
- Over completion detection with automatic strike rotation
- Match scheduling system — set a public start time visible to viewers
- Toss setup screen — toss winner + decision (bat/bowl) determines batting order
- Opening batsmen and bowler selection from squad lists
- Squad picker with duplicate prevention (same player can't be striker AND non-striker)
- Live Run Rate (LRR) calculated after every delivery
- Sync status indicator (SYNCED / PENDING / ERROR)
- Full match reset with danger confirmation
- PIN-based authentication for scorer access
- Session persistence — auth state, selected match, and active screen survive page refreshes via localStorage
- Active match resume prompt — detects in-progress matches on re-entry
- Audit logging — every scoring action is sent to server-side log API
- Scorecard view, match report view, and timeline history view within scorer
- Match result auto-sync to Google Sheets on completion

---

## 2. Real-Time Data Sync & Offline Resilience

- Optimistic UI updates — state is set locally before server confirmation
- Every state push saves to localStorage as offline backup
- Background sync queue — failed pushes are queued in `vpl_pending_sync_{matchId}` keys
- Background retry loop (5-second interval) automatically re-syncs queued updates when connection restores
- Online/offline detection via `navigator.onLine`
- Redis (KV store) used as real-time state backend for sub-second propagation
- `lastSyncedAt` timestamp on every state push for conflict detection

---

## 3. Live Spectator Experience (live-client.tsx — 754 lines)

- Public-facing live match viewer with 3-second polling
- Performance guard — UI only re-renders when actual data changes (compares timeline length, runs, wickets, status, winner)
- Ref-based state tracking to avoid stale closures in polling callbacks
- Full-screen animated overlays for big events:
  - **FOUR!** — amber flash-bang with particle animation and player name skewed banner
  - **SIX!!** — same with larger emphasis
  - **WICKET!** — red-themed dramatic animation
  - All animations use React Portal for reliable mobile rendering
- Animated particle system — 12 abstract shapes radiating outward during event animations
- Flash-bang white screen effect that fades during big events
- Live score "big board" with team-colored glassmorphism ambient backgrounds
- Spring-animated score counter with 3D perspective tilt on run changes
- Scale/fade animations on wicket count changes
- Real-time batsmen stats display (striker highlighted with amber indicator, non-striker secondary)
- Real-time bowler stats display (figures, overs) with blue accent
- Second innings chase banner — shows "NEED X RUNS IN Y BALLS" + Required Run Rate
- Recent deliveries timeline — horizontal scroll of last 12 balls with color-coded chips (red = wicket, amber = boundary)
- Toss update card with trophy icon animation (shown before first ball)
- "Starting Soon" / "Waiting for Toss" state with vs graphic
- Scheduled match view with formatted date/time display
- Innings break overlay — displays first innings total with target info
- Match over overlay — shows result with option to view full scorecard
- Full scorecard overlay modal with per-innings breakdown
- Real-time notification system — fetches and displays bell notifications from API
- "No Live Match" state with next upcoming fixture preview
- All views mobile-first responsive

---

## 4. Points Table & Standings (points-client.tsx)

- Dynamic points table with automatic Group A and Group B separation
- Standings sorted by: Points → NRR → Wins
- Net Run Rate algorithm with:
  - Fractional over conversion (2.4 overs → 2 + 4/6 = 2.667 overs)
  - All-out adjustment — team bowled out is considered to have faced full quota of overs for NRR purposes
  - Per-match NRR aggregation across all completed group stage matches
- Automatic knockout bracket resolution:
  - Semi-Final 1: 1st Group A vs 2nd Group B
  - Semi-Final 2: 1st Group B vs 2nd Group A
  - Final: Winner SF1 vs Winner SF2
- Qualification detection — identifies mathematically confirmed qualifiers based on maximum possible points of 3rd-place teams
- Tiebreaker support with manual admin override for edge cases
- Team colors displayed alongside standings
- Live data integration — standings update from completed match states in Redis

---

## 5. Tournament Statistics & Leaderboards (stats-client.tsx — 303 lines)

- Four leaderboard categories:
  - **Highest Runs** (minimum 15 balls qualification)
  - **Best Strike Rate** (minimum 15 balls)
  - **Most Wickets** (minimum 3 overs / 18 balls)
  - **Best Economy** (minimum 3 overs / 18 balls)
- Expandable view — default shows top 5, expandable to top 10
- Stats aggregated across all matches from timeline data
- Correct handling of extras in stats: WD doesn't count for batsman, NB counts runs but not ball faced, run-outs excluded from bowler wickets

---

## 6. MVP Algorithm & Achievement System (mvp.ts — 188 lines)

- Custom weighted MVP scoring formula:
  - Batting: 1pt/run, +1pt/four, +2pt/six, +10pt for 25+ runs, +20pt for 50+ runs, +SR bonus (SR/10)
  - Bowling: 25pt/wicket, 2pt/dot ball, 15pt/maiden, economy bonus = max(0, 12−economy) × 5
  - Fielding: 10pt/catch, 12pt/stumping, 15pt/run-out
  - Team success: 10pt/match won
- Maiden over detection from timeline analysis (bowler who conceded 0 runs in a complete over)
- Win bonus distributed to all players who participated in the winning team
- Achievement badges auto-generated per player:
  - "X Total Runs" (50+ runs)
  - "X Huge Sixes" (5+ sixes)
  - "X Boundaries" (10+ fours)
  - "X Wickets Taken" (3+ wickets)
  - "X Maiden Overs" (1+ maidens)
  - "X Dot Balls" (10+ dots)
  - "X Fielding Dismissals" (3+ combined catches/stumpings/run-outs)
  - "X Match Wins" (2+ wins)
  - "Explosive SR of X" (strike rate > 200, min 10 balls)
  - "Clinical Economy of X" (economy < 7.0, min 12 balls bowled)
- Admin-controlled MVP publication via API (`/api/mvp`) — MVP badge only shown when admin publishes
- Dedicated MVP showcase section on stats page with glow effect, gradient badge, and achievement grid

---

## 7. Google Sheets Integration (sheets.ts)

- Bi-directional sync: Google Sheets serves as the admin-editable data source (squads, fixtures, results)
- Google Service Account authentication with automatic private key newline restoration
- Read, Write, and Clear operations via Google Sheets API v4
- Robust JSON parsing of service account credentials with quote-stripping for different env parsers
- CSV export URLs for client-side data fetching (squads + fixtures)
- PapaParse CSV parsing with typed interfaces and error recovery
- HTML response detection — gracefully handles Google Sheets returning error pages instead of CSV

---

## 8. API Layer (11 endpoints)

- `/api/live-score` — GET/POST live match state to/from Redis
- `/api/live-score/all` — GET all match states (for stats aggregation)
- `/api/active-match` — GET/POST which match is currently "Live" for the public viewer
- `/api/matches` — GET fixtures from Google Sheets, POST updated fixtures back (result sync)
- `/api/squads` — squad data endpoint
- `/api/mvp` — GET/POST MVP selection and publication status
- `/api/notify` — real-time notification system for live viewers
- `/api/logs` — audit trail logging for scorer actions
- `/api/scorer-auth` — PIN-based authentication for scorer dashboard
- `/api/admin/login` — admin panel authentication
- `/api/reset-data` — data clearing utility

---

## 9. Authentication & Security (auth.ts)

- Dual authentication: HTTP-only cookie (`vpl_scorer_token`) AND internal API key (`x-vpl-internal-key`)
- Separate Scorer PIN and Admin Password with both accepted for cookie auth
- Server-side validation using Next.js `cookies()` and `headers()` APIs
- Environment-variable-based credential management

---

## 10. Reusable UI Components

- **Scorecard** (`scorecard.tsx`) — full batting and bowling scorecard with per-player stats, dismissal info, strike rates, economy rates; reused across scorer, live, and match report views
- **Match Report** (`match-report.tsx`) — detailed post-match summary component used in multiple contexts
- **Innings Break Overlay** (`innings-break-overlay.tsx`) — animated mid-match overlay showing first innings total and target
- **Match Over Overlay** (`match-over-overlay.tsx`) — result announcement overlay with option to view scorecard
- **Champion Banner** (`ChampionBanner.tsx` + `ChampionBannerClient.tsx`) — celebratory animation triggered when tournament winner is crowned; confetti and dynamic winner reveal
- **Navbar** (`Navbar.tsx`) — site-wide navigation with dynamic "LIVE MATCH" button that glows/pulses when a match is actively live
- **Error Boundary** (`ErrorBoundary.tsx`) — granular React error boundary to keep dashboard operational during failures

---

## 11. Fixture & Match System (tournament.ts — 503 lines)

- Typed data model for the entire tournament: `Team`, `Fixture`, `LiveMatchState`, `BallEvent`, `Innings`, `BatsmanStats`, `BowlerStats`
- Round-robin fixture generation for groups of 4 teams
- Knockout bracket auto-population from group standings
- 5 match statuses: SCHEDULED → LIVE → INNINGS_BREAK → COMPLETED / ABANDONED
- 8 extra/event types: WD, NB, B, LB, DB, SWAP, OVERRIDE, normal
- 7 wicket types: BOWLED, CAUGHT, RUNOUT, LBW, STUMPED, HIT_WICKET, RETIRED_HURT
- ISR (Incremental Static Regeneration) for squads data (60-second revalidation)
- Cache-busting via timestamp parameter for fixtures and teams (real-time freshness)

---

## 12. Pages & Routing (Next.js App Router)

- **Home** (`/`) — landing page with tournament branding
- **Live** (`/live`) — public real-time match viewer
- **Matches** (`/matches`) — all fixtures with results; individual match pages (`/matches/[matchId]`)
- **Points** (`/points`) — live points table with NRR
- **Squads** (`/squads`) — team rosters with player roles and auction prices; player profile modals
- **Stats** (`/stats`) — leaderboards and MVP showcase
- **Scorer** (`/scorer`) — protected scoring dashboard (multi-screen flow)
- **Admin** (`/admin`) — backend management panel

---

## 13. UX / Visual Design

- Premium dark-mode-first design with black/zinc/amber color palette
- Glassmorphism — `backdrop-blur-xl`, semi-transparent borders, layered ambient glow backgrounds
- Hardware-accelerated animations via Framer Motion (`motion` components throughout)
- Spring-physics score animations with 3D perspective transforms
- Team-colored ambient backgrounds that transition with team changes
- Custom typography system: display, heading, body, and mono font families via CSS custom properties
- Mobile-first responsive design across all pages
- Custom scrollbar styling
- Loading states with branded spinners and tracking-widest uppercase microcopy
- Micro-interactions: hover scale effects on delivery chips, glow on active elements, pulse on live indicators

---

## 14. Performance Optimizations

- Polling guards — live viewer only triggers React state updates when data has actually changed (prevents unnecessary re-renders)
- `useRef` for latest state access inside polling callbacks (avoids stale closure problem)
- `useCallback` and `useMemo` for expensive computations and team lookups
- Reduced CSS blur intensity on mobile devices
- GPU acceleration hints on animated elements
- ISR with configurable revalidation windows
- Relaxed polling interval (3 seconds) to reduce server load while maintaining near-real-time feel

---

## 15. Data Integrity & Error Handling

- Event-sourced architecture — any single delivery can be deleted or edited, and the entire match state is cleanly recalculated
- Tolerant team-name matching — normalizes names (lowercased, stripped of special characters) to handle inconsistencies between Google Sheets and Redis data
- Graceful error recovery — empty arrays returned on fetch failures instead of crashes
- React Error Boundary wrapping critical UI sections
- Confirmation dialogs for destructive actions (match reset, ball deletion)
- Not-found (404) and error pages with branded styling

---

## 16. DevOps & Infrastructure

- **Deployment**: Vercel (production hosting with edge functions)
- **Real-time State**: Redis / Upstash KV
- **Data Persistence**: Google Sheets (admin-friendly, non-technical interface)
- **Authentication**: Google Cloud Service Account for Sheets API
- **Version Control**: Git with `.gitattributes` for LFS
- **Utility Scripts**: `clean-keys.js` (Redis key management), `simulate_tournament.js` (tournament simulation)
- **Environment Management**: `.env.local` for all secrets (Redis URL, Google credentials, admin password, scorer PIN, sheet IDs)

---

## Technical Stack Summary

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS + Vanilla CSS (hardware-accelerated) |
| Animations | Framer Motion |
| Icons | Lucide React |
| Real-time State | Redis / Upstash KV |
| Data Source | Google Sheets API v4 + PapaParse CSV |
| Auth | Cookie + API Key dual-auth |
| Deployment | Vercel |
| Version Control | Git |
