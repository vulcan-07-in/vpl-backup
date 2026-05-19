import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';

// Server-side: use service role key for full access (bypasses RLS)
// Falls back to anon key if service role key is not set
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'placeholder';

// Server-side client — used in API routes and server components
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Browser-side client — used in client components for realtime subscriptions
// Uses anon key (read-only via RLS)
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
);
