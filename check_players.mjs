import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { data: players, error } = await supabase.from('Player').select('*');
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Players:", JSON.stringify(players, null, 2));
    }
}
main();
