### **VPL Phase 2: Live Engine Resumption Prompt**

**Project Context:**
We are building the **Varchasva Premier League (VPL)** platform using Next.js (App Router), Tailwind CSS (Glassmorphism), and Framer Motion. The app currently pulls core tournament data (Teams, Fixtures) from Google Sheets using ISR (Incremental Static Regeneration).

**Current Progress:**
1.  **Refactored "Matches"**: We have successfully renamed `/fixtures` to `/matches` across the entire codebase (routes, components, and API calls).
2.  **Infrastructure Ready**: We have established the Performance Audit and updated the `implementation_plan.md` to reflect a broadcast-grade Live Engine.
3.  **Next Step**: Installing `@vercel/kv` to handle real-time scoring.

**The "Phase 2" Vision (The Objective):**
Transform the site from a static schedule into a professional **Live Tournament Platform** capable of handling 200+ concurrent ground viewers without hitting Vercel limits.

**Technical Architecture Requirements:**
1.  **Scoring Backend**: Use **@vercel/kv (Redis)** for sub-second updates. Every ball is stored as an "Event" in a timeline to enable a 100% reliable **"Undo Last Ball"** feature.
2.  **Scorer Dashboard (iPad Optimized)**:
    *   Dedicated Admin view with large touch-targets for $+1, +4, +6$, Wicket, Dot, and Extras.
    *   **Logic Engine**: Automatic handling of **Strike Rotation**, Bowler spells, and Over transitions.
    *   **Super Over Mode**: Ability to toggle into Super Over logic when required.
    *   **Safety**: "Confirm Wicket" popups to prevent accidental scoring errors.
3.  **The Match Center**:
    *   A dynamic, tabbed UI for each match: **Live Score** (Ball-by-ball), **Full Scorecard** (Player stats), and **Standings Impact** (Real-time qualification scenarios).
    *   **Dynamic Theming**: The ambient glow of the site shifts based on the batting team's color.
4.  **Tournament Intelligence (The Engine)**:
    *   **Live NRR**: A formulaic engine that calculates NRR to 3 decimal places, correctly handling "All Out" as full-quota overs.
    *   **Automatic Standings**: The points table highlights teams as `Qualified`, `In Contention`, or `Eliminated` in real-time.
5.  **Scaling for 200+ Viewers**:
    *   Implement **SWR (Stale-While-Revalidate)** on the frontend.
    *   Uses **Edge Caching** (5-second cache window) so 200 users only result in ~700 database hits per hour, keeping us well within the Vercel Free Tier.

**Immediate Task List for Next Session:**
1.  Run `npm install @vercel/kv`.
2.  Define `LiveMatchState` and `BallEvent` interfaces in `src/lib/tournament.ts`.
3.  Create the `api/live-score` route to handle KV GET/POST operations.
4.  Build the shell for the **iPad Scorer Dashboard** in `/admin/scorer`.
