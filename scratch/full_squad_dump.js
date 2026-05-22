const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

let supabaseUrl = 'https://dzufjnvaodzydcdtamkp.supabase.co';
let supabaseServiceRoleKey = '';
const envLocalPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
    fs.readFileSync(envLocalPath, 'utf-8').split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
            if (key === 'SUPABASE_URL') supabaseUrl = val;
            if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseServiceRoleKey = val;
        }
    });
}
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function run() {
    // Get teams
    const { data: teams } = await supabase.from("Team").select("id, name").order("name");
    
    // Get ALL registrations with player names
    const { data: regs } = await supabase
        .from("vpl_registrations")
        .select("account_id, team_name, price, is_captain, role, varchasva_accounts(name)")
        .eq("season", 2)
        .order("price", { ascending: false });

    // Also show the raw_data.tsv mapping for cross-reference
    console.log("=== VAR-ID TO PLAYER NAME MAPPING (from database) ===\n");
    const allAccounts = {};
    regs.forEach(r => {
        allAccounts[r.account_id] = r.varchasva_accounts?.name || "UNKNOWN";
    });
    // Sort by VAR number
    Object.keys(allAccounts).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''));
        const numB = parseInt(b.replace(/\D/g, ''));
        return numA - numB;
    }).forEach(id => {
        console.log(`  ${id} = ${allAccounts[id]}`);
    });

    console.log("\n=== CURRENT SQUAD ASSIGNMENTS ===\n");
    
    for (const team of teams) {
        const teamPlayers = regs.filter(r => r.team_name === team.name);
        const captains = teamPlayers.filter(r => r.is_captain);
        const auctioned = teamPlayers.filter(r => !r.is_captain);
        const totalSpent = teamPlayers.reduce((s, r) => s + (r.price || 0), 0);
        
        console.log(`\n${team.name} (${teamPlayers.length} players, spent: ₹${totalSpent})`);
        console.log("─".repeat(50));
        
        if (captains.length > 0) {
            captains.forEach(c => {
                console.log(`  👑 CAPTAIN: ${c.varchasva_accounts?.name || 'UNKNOWN'} (${c.account_id}) - ₹${c.price}`);
            });
        }
        
        auctioned.forEach(p => {
            console.log(`  ${p.varchasva_accounts?.name || 'UNKNOWN'} (${p.account_id}) - ₹${p.price} [${p.role || 'N/A'}]`);
        });
    }

    // Show UNSOLD players
    const unsold = regs.filter(r => r.team_name === 'UNSOLD' || r.team_name === 'PASSED');
    console.log(`\n\n=== UNSOLD/PASSED PLAYERS (${unsold.length}) ===`);
    unsold.forEach(p => {
        console.log(`  ${p.varchasva_accounts?.name || 'UNKNOWN'} (${p.account_id}) - ${p.team_name}`);
    });

    // Check auction history timestamps
    const { data: history } = await supabase
        .from("vpl_auction_history")
        .select("timestamp")
        .order("timestamp", { ascending: true })
        .limit(1);
    const { data: historyLast } = await supabase
        .from("vpl_auction_history")
        .select("timestamp")
        .order("timestamp", { ascending: false })
        .limit(1);
    
    console.log(`\n\n=== AUCTION TIMELINE ===`);
    console.log(`  First sale: ${history?.[0]?.timestamp}`);
    console.log(`  Last sale:  ${historyLast?.[0]?.timestamp}`);
}

run().catch(e => console.error(e));
