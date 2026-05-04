# Implementation Plan – Supabase Migration & Season 2 MVP

## Goal
- Migrate all Season 2 data access from Prisma to Supabase (the project already exists).
- Preserve existing Season 1 data which continues to use Prisma.
- Expose a new MVP page for Season 2 at `/s2` (sub‑domain `s2.varchasva...` works automatically).
- Keep live‑score functionality via Redis (already using `s2:` keys).

## High‑Level Steps
1. **Add Supabase client** (`src/lib/supabase.ts`).
2. **Create data abstraction** (`src/lib/data.ts`) that chooses Prisma for Season 1 and Supabase for Season 2 based on a `season` argument.
3. **Update API routes** (`matches`, `admin/teams`, any other Prisma usage) to call the new data helpers instead of direct Prisma calls.
4. **Add new Season 2 page** (`src/app/s2/page.tsx`) that mirrors the existing Points page but pulls fixtures/teams via the new data layer.
5. **Add environment variables** (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) to `.env` and `.env.local`.
6. **Update `package.json`** to include `@supabase/supabase-js`.
7. **Ensure Redis keys** continue using the `s2:` prefix (already the case).
8. **Testing & verification** – manual checks in a Vercel preview, ensure Season 1 pages still work.

## Detailed File Changes
- **src/lib/supabase.ts** [NEW]
  ```ts
  import { createClient } from '@supabase/supabase-js';
  export const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );
  ```
- **src/lib/data.ts** [MODIFY]
  - Export functions: `fetchTeams(season?: number)`, `fetchFixtures(season?: number)`, `fetchMatch(matchNo: string, season?: number)`, `updateMatch(...)` etc.
  - Inside each, if `season === 2` use Supabase queries; otherwise fall back to Prisma (`import prisma from '@/lib/prisma'`).
- **src/app/api/matches/route.ts** [MODIFY]
  - Replace direct Prisma calls with calls to `data.ts` helpers, passing `season: 2` for all actions.
- **src/app/api/admin/teams/route.ts** [MODIFY]
  - Use `fetchTeams(2)` helper.
- **src/app/s2/page.tsx** [NEW]
  - Same UI as `src/app/points/page.tsx` but imports from `data.ts` with `season: 2`.
- **.env** [MODIFY]
  - Add Supabase keys.
- **package.json** [MODIFY]
  - Add `@supabase/supabase-js` dependency.

## Verification Steps
1. Run `npm install`.
2. Start dev server: `npm run dev`.
3. Visit `/s2` – should display points table using Season 2 data.
4. Verify existing `/points` (Season 1) still works and data unchanged.
5. Test admin routes – create, update, delete matches – confirm Supabase tables updated.
6. Deploy to Vercel preview, check sub‑domain `s2.varchasva...` resolves correctly.

## Notes
- Supabase tables must mirror the Prisma schema (`team`, `match`, `player`, etc.).
- The MVP page will only show points; further features (live scoring UI, knockout resolution) can be added later.
- No data migration is performed; Season 1 continues on Prisma, Season 2 uses Supabase from day 1.
