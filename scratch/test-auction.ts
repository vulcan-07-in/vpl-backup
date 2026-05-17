import { supabase } from "./src/lib/supabase";
supabase.from("vpl_auction_state").select("*").then(console.log).catch(console.error);
