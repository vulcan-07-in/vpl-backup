# VPL DEPLOYMENT & DATABASE RULES

## CRITICAL: DATA SEPARATION
The data of the `preview` website and the `live` website MUST be completely separate. 

Before pushing ANY update, you must ensure that the environment variables are correctly mapped to isolated databases.

### 1. Production (Live)
- **Branch**: `main`
- **URL**: `s2.vpl.com` (or equivalent live domain)
- **Supabase**: Must point to the **Production** Supabase project.
- **Redis**: Must point to the **Production** Upstash Redis instance.

### 2. Preview / Staging
- **Branch**: `season-2-preview`
- **URL**: `preview.vpl.com` / Vercel preview URLs
- **Supabase**: Must point to a **dedicated Preview/Staging** Supabase project.
- **Redis**: Must point to a **dedicated Preview/Staging** Upstash Redis instance.

### 3. Local Development
- Always use the `.env.local` which should mirror the **Preview/Staging** environment, OR use a local Supabase instance.
- **NEVER** connect local development to the Production database.

## DEPLOYMENT CHECKLIST
Before merging to `main` or pushing a significant update to `season-2-preview`:
1. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the deployment environment.
2. Verify `REDIS_URL` in the deployment environment.
3. Ensure no hardcoded database IDs or URLs exist in the codebase.
4. Confirm that the cache flush policies will not impact the wrong environment.
