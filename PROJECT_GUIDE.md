# Project Directory Guide

This project is a Next.js 16 application designed for managing and live-scoring the Varchasva Premier League cricket tournament. It leverages Google Sheets for persistence and Redis for real-time updates.

## 📂 Root Structure
| Path | Description |
| :--- | :--- |
| `src/` | Main application source code. |
| `public/` | Static assets like icons and logos. |
| `scripts/` | Utility scripts for maintenance (e.g., clearing match data). |
| `.env.local` | Sensitive configuration (API keys, Redis URL). |
| `next.config.ts` | Next.js framework configuration. |
| `package.json` | Project metadata and dependencies. |

---

## 🏗️ Source Code (`src/`)

### 🌐 `src/app/` (Routing & Pages)
The application uses the Next.js App Router. Each folder represents a URL path.

- **`scorer/`**: The core scoring engine. Used by officials to record every ball.
- **`live/`**: The public-facing live match tracker.
- **`matches/`**: Displays tournament fixtures and past results.
- **`points/`**: Dynamic points table and group standings.
- **`squads/`**: Displays team rosters and player statistics.
- **`admin/`**: Backend management for fixtures and tournament status.
- **`api/`**: Server-side endpoints:
  - `active-match/`: Manages which match is currently "Live."
  - `live-score/`: Real-time Redis updates for the scoring engine.
  - `logs/`: Audit trail for scoring actions.
  - `matches/`: Syncs fixtures with Google Sheets.

### 🛠️ `src/lib/` (Business Logic)
- **`tournament.ts`**: The "Heart" of the app. Defines every data structure (`BallEvent`, `Innings`, `MatchState`) and handles CSV/API fetching.
- **`sheets.ts`**: Handles complex authentication and Read/Write operations with the Google Sheets API.
- **`auth.ts`**: Security helpers for the admin and scorer panels.

### 🍱 `src/components/` (Reusable UI)
- **`Navbar.tsx`**: The main navigation bar with live status indicators.
- **`match-report.tsx`**: The detailed scorecard component used in multiple views.
- **`ChampionBanner.tsx`**: The celebratory UI triggered when a tournament winner is crowned.

---

## 🔑 Key Files for Developers
- **`src/app/scorer/scorer-client.tsx`**: Contains the complex scoring logic and state transitions.
- **`src/lib/tournament.ts`**: The absolute reference for all cricket-related data types.
- **`.env.local`**: Ensure `REDIS_URL` and `GOOGLE_SERVICE_ACCOUNT_JSON` are correctly configured for local development.
