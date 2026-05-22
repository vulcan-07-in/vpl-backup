const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local for credentials
let supabaseUrl = 'https://dzufjnvaodzydcdtamkp.supabase.co';
let supabaseServiceRoleKey = '';

const envLocalPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
    const envContent = fs.readFileSync(envLocalPath, 'utf-8');
    envContent.split('\n').forEach(line => {
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
    console.log("=== DIAGNOSIS REPORT ===\n");

    // 1. Check teams
    const { data: teams } = await supabase.from("Team").select("id, name").order("name");
    console.log("TEAMS:");
    teams.forEach(t => console.log(`  ${t.name} => ${t.id}`));

    // 2. Check auction history — show all entries with team name mapped
    const { data: history } = await supabase
        .from("vpl_auction_history")
        .select("*")
        .order("timestamp", { ascending: true });

    const teamMap = {};
    teams.forEach(t => { teamMap[t.id] = t.name; });

    console.log(`\nAUCTION HISTORY (${history.length} entries):`);
    // Group by team
    const byTeam = {};
    history.forEach(h => {
        const tName = teamMap[h.team_id] || `UNKNOWN(${h.team_id})`;
        if (!byTeam[tName]) byTeam[tName] = [];
        byTeam[tName].push({ player: h.player_id, amount: h.bid_amount });
    });
    Object.keys(byTeam).sort().forEach(tName => {
        console.log(`\n  ${tName} (${byTeam[tName].length} players):`);
        byTeam[tName].forEach(p => console.log(`    ${p.player} => ₹${p.amount}`));
    });

    // 3. Check current registrations (sold players only)
    const { data: regs } = await supabase
        .from("vpl_registrations")
        .select("account_id, team_name, price, is_captain, role")
        .eq("season", 2)
        .not("team_name", "in", '("UNSOLD","PASSED","")');

    console.log(`\n\nCURRENT REGISTRATIONS (assigned to teams): ${regs.length} total`);
    const regByTeam = {};
    regs.forEach(r => {
        if (!regByTeam[r.team_name]) regByTeam[r.team_name] = [];
        regByTeam[r.team_name].push({
            id: r.account_id,
            price: r.price,
            captain: r.is_captain
        });
    });
    Object.keys(regByTeam).sort().forEach(tName => {
        const players = regByTeam[tName];
        const totalSpent = players.reduce((s, p) => s + (p.price || 0), 0);
        console.log(`\n  ${tName} (${players.length} players, spent: ₹${totalSpent}):`);
        players.forEach(p => {
            const cap = p.captain ? " [CAPTAIN]" : "";
            console.log(`    ${p.id} => ₹${p.price}${cap}`);
        });
    });

    // 4. Check for players that appear in history but NOT in registrations
    console.log("\n\nMISMATCH CHECK:");
    const regAccountIds = new Set(regs.map(r => r.account_id));
    const histPlayerIds = new Set(history.map(h => h.player_id));
    
    // Players in history but not assigned
    const missingFromRegs = [...histPlayerIds].filter(id => !regAccountIds.has(id));
    if (missingFromRegs.length > 0) {
        console.log(`  Players in auction history but NOT assigned to a team: ${missingFromRegs.join(', ')}`);
    } else {
        console.log("  All auctioned players are assigned to teams. ✓");
    }

    // Players assigned but not in history (captains are expected)
    const captainIds = new Set(regs.filter(r => r.is_captain).map(r => r.account_id));
    const assignedNotInHistory = [...regAccountIds].filter(id => !histPlayerIds.has(id) && !captainIds.has(id));
    if (assignedNotInHistory.length > 0) {
        console.log(`  Players assigned to teams but NOT in auction history (non-captains): ${assignedNotInHistory.join(', ')}`);
    }

    // 5. Check for duplicate auction history entries (same player sold twice)
    const playerCounts = {};
    history.forEach(h => {
        playerCounts[h.player_id] = (playerCounts[h.player_id] || 0) + 1;
    });
    const duplicates = Object.entries(playerCounts).filter(([, c]) => c > 1);
    if (duplicates.length > 0) {
        console.log(`\n  DUPLICATES in auction history (player sold multiple times):`);
        duplicates.forEach(([pid, count]) => {
            const entries = history.filter(h => h.player_id === pid);
            console.log(`    ${pid} appears ${count} times:`);
            entries.forEach(e => console.log(`      -> team: ${teamMap[e.team_id]}, amount: ₹${e.bid_amount}, time: ${e.timestamp}`));
        });
    } else {
        console.log("  No duplicate entries in auction history. ✓");
    }

    // 6. Check total accounts
    const { count: totalAccounts } = await supabase
        .from("varchasva_accounts")
        .select("*", { count: "exact", head: true });
    console.log(`\nTotal accounts in varchasva_accounts: ${totalAccounts}`);

    const { count: totalRegs } = await supabase
        .from("vpl_registrations")
        .select("*", { count: "exact", head: true })
        .eq("season", 2);
    console.log(`Total registrations for season 2: ${totalRegs}`);
}

run().catch(e => console.error(e));
