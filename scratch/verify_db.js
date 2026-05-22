const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://dzufjnvaodzydcdtamkp.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6dWZqbnZhb2R6eWRjZHRhbWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTg3ODUsImV4cCI6MjA5MjgzNDc4NX0.g1I8WJUEJ0kaOhCwiDXpUGR-dMYsGB4Lq4iCxmjdR9U');

async function test() {
    console.log("=== Querying live database tables ===");
    
    const { data: teams, error: teamErr } = await supabase.from('Team').select('id, name');
    if (teamErr) {
        console.error("Error fetching Teams:", teamErr);
    } else {
        console.log(`Teams found in 'Team' table (${teams.length}):`);
        teams.forEach(t => console.log(` - [${t.id}] ${t.name}`));
    }

    const { data: accounts, error: accErr } = await supabase.from('varchasva_accounts').select('account_id, name').limit(5);
    if (accErr) {
        console.error("Error fetching Accounts:", accErr);
    } else {
        console.log(`\nSample of Accounts found in 'varchasva_accounts' table:`);
        accounts.forEach(a => console.log(` - [${a.account_id}] ${a.name}`));
    }

    const { data: regs, error: regErr } = await supabase.from('vpl_registrations').select('registration_id, account_id, team_name, role').limit(5);
    if (regErr) {
        console.error("Error fetching Registrations:", regErr);
    } else {
        console.log(`\nSample of Registrations found in 'vpl_registrations' table:`);
        regs.forEach(r => console.log(` - [${r.registration_id}] Account: ${r.account_id} -> Team: ${r.team_name} (Role: ${r.role})`));
    }
}

test();
