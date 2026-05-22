const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://dzufjnvaodzydcdtamkp.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6dWZqbnZhb2R6eWRjZHRhbWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTg3ODUsImV4cCI6MjA5MjgzNDc4NX0.g1I8WJUEJ0kaOhCwiDXpUGR-dMYsGB4Lq4iCxmjdR9U');

async function inspect() {
    console.log("=== ANALYZING AUCTION HISTORY ===");
    
    const { data: history, error: histErr } = await supabase.from('vpl_auction_history').select('*');
    if (histErr) throw histErr;

    const { data: teams, error: teamErr } = await supabase.from('Team').select('id, name');
    if (teamErr) throw teamErr;

    const { data: accounts, error: accErr } = await supabase.from('varchasva_accounts').select('account_id, name');
    if (accErr) throw accErr;

    const teamMap = {};
    teams.forEach(t => teamMap[t.id] = t.name);

    const accMap = {};
    accounts.forEach(a => accMap[a.account_id] = a.name);

    console.log(`Loaded ${history.length} transactions, ${teams.length} teams, and ${accounts.length} player accounts.`);

    const playerBids = {}; // Map of player_id -> latest / winning bid
    history.forEach(h => {
        // Keep the highest/latest bid for each player
        if (!playerBids[h.player_id] || playerBids[h.player_id].id < h.id) {
            playerBids[h.player_id] = h;
        }
    });

    const uniquePlayers = Object.keys(playerBids);
    console.log(`\nUnique sold players count: ${uniquePlayers.length}`);

    console.log("\nSold Players and Assignments:");
    uniquePlayers.forEach(pId => {
        const bid = playerBids[pId];
        console.log(` - [${pId}] ${accMap[pId] || 'Unknown'} sold to "${teamMap[bid.team_id]}" for ${bid.bid_amount}`);
    });
}

inspect();
