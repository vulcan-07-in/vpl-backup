const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://dzufjnvaodzydcdtamkp.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6dWZqbnZhb2R6eWRjZHRhbWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTg3ODUsImV4cCI6MjA5MjgzNDc4NX0.g1I8WJUEJ0kaOhCwiDXpUGR-dMYsGB4Lq4iCxmjdR9U');

async function listTables() {
    console.log("Listing tables in public schema...");
    const { data, error } = await supabase.rpc('get_tables_list'); // checking if an RPC exists
    if (error) {
        // If no RPC, let's query a known table to check columns or run a generic RPC if possible
        console.log("No get_tables_list RPC. Trying to query schema tables via standard queries...");
        // In Supabase standard anon key, we cannot query pg_catalog directly, but let's try calling pg_tables
        const { data: data2, error: err2 } = await supabase.from('varchasva_accounts').select('count', { count: 'exact', head: true });
        console.log("varchasva_accounts count:", data2, err2);
    } else {
        console.log("Tables:", data);
    }
}

listTables();
