-- VPL Season 2 — Schema Updates for Auction Rebuild
-- Run this in Supabase SQL Editor (Dashboard → SQL → New query)

-- 1. Add gender column to vpl_registrations (if not exists)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vpl_registrations' AND column_name = 'gender') THEN
        ALTER TABLE vpl_registrations ADD COLUMN gender TEXT DEFAULT 'Male';
    END IF;
END $$;

-- 2. Add auction state columns (if not exists)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vpl_auction_state' AND column_name = 'show_pool_to_viewers') THEN
        ALTER TABLE vpl_auction_state ADD COLUMN show_pool_to_viewers BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vpl_auction_state' AND column_name = 'active_pool') THEN
        ALTER TABLE vpl_auction_state ADD COLUMN active_pool TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vpl_auction_state' AND column_name = 'bid_increment') THEN
        ALTER TABLE vpl_auction_state ADD COLUMN bid_increment INTEGER;
    END IF;
END $$;

-- 3. Ensure auction state row exists
INSERT INTO vpl_auction_state (id, status, active_player_id, current_bid, leading_team_id, show_pool_to_viewers, active_pool, bid_increment)
VALUES (1, 'IDLE', NULL, 0, NULL, true, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- 4. Disable RLS on tables used by admin (service role key bypasses anyway, but just in case)
ALTER TABLE "Team" ENABLE ROW LEVEL SECURITY;
ALTER TABLE vpl_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE varchasva_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vpl_auction_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE vpl_auction_history ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for service role (these allow the service role key to do everything)
-- For anon key (viewer), we only need SELECT on auction_state and registrations

-- Team table policies
DROP POLICY IF EXISTS "Allow all for service role" ON "Team";
CREATE POLICY "Allow all for service role" ON "Team" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read for anon" ON "Team";
CREATE POLICY "Allow read for anon" ON "Team" FOR SELECT USING (true);

-- vpl_registrations policies
DROP POLICY IF EXISTS "Allow all for service role" ON vpl_registrations;
CREATE POLICY "Allow all for service role" ON vpl_registrations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read for anon" ON vpl_registrations;
CREATE POLICY "Allow read for anon" ON vpl_registrations FOR SELECT USING (true);

-- varchasva_accounts policies
DROP POLICY IF EXISTS "Allow all for service role" ON varchasva_accounts;
CREATE POLICY "Allow all for service role" ON varchasva_accounts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read for anon" ON varchasva_accounts;
CREATE POLICY "Allow read for anon" ON varchasva_accounts FOR SELECT USING (true);

-- Auction state policies
DROP POLICY IF EXISTS "Allow all for service role" ON vpl_auction_state;
CREATE POLICY "Allow all for service role" ON vpl_auction_state FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read for anon" ON vpl_auction_state;
CREATE POLICY "Allow read for anon" ON vpl_auction_state FOR SELECT USING (true);

-- Auction history policies
DROP POLICY IF EXISTS "Allow all for service role" ON vpl_auction_history;
CREATE POLICY "Allow all for service role" ON vpl_auction_history FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read for anon" ON vpl_auction_history;
CREATE POLICY "Allow read for anon" ON vpl_auction_history FOR SELECT USING (true);

-- 5. Enable realtime for auction tables (required for viewer/auctioneer live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE vpl_auction_state;
ALTER PUBLICATION supabase_realtime ADD TABLE vpl_auction_history;
ALTER PUBLICATION supabase_realtime ADD TABLE vpl_registrations;

-- 6. Drop restrictive tier check constraint to allow custom tier values (TIER 3, TIER 4, etc.)
ALTER TABLE vpl_registrations DROP CONSTRAINT IF EXISTS vpl_registrations_tier_check;

-- 7. Create Supabase Storage bucket for team logos (public read access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('team-logos', 'team-logos', true, 5242880, ARRAY['image/png','image/jpeg','image/webp','image/gif','image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for team-logos bucket
DROP POLICY IF EXISTS "Public read team logos" ON storage.objects;
DROP POLICY IF EXISTS "Service role upload team logos" ON storage.objects;
DROP POLICY IF EXISTS "Service role update team logos" ON storage.objects;

CREATE POLICY "Public read team logos" ON storage.objects
    FOR SELECT USING (bucket_id = 'team-logos');

CREATE POLICY "Service role upload team logos" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'team-logos');

CREATE POLICY "Service role update team logos" ON storage.objects
    FOR UPDATE USING (bucket_id = 'team-logos');
