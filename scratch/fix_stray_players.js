const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const Redis = require('ioredis');

// Parse .env.local
let supabaseUrl = 'https://dzufjnvaodzydcdtamkp.supabase.co';
let supabaseServiceRoleKey = '';
let redisUrl = '';

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
            if (key === 'REDIS_URL') redisUrl = val;
        }
    });
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const redis = new Redis(redisUrl);
const MAX_BUDGET = 10000;

async function run() {
    console.log("=== FIX: Reset stray players not in auction history ===\n");

    // 1. Get all auction history player IDs
    const { data: history } = await supabase
        .from("vpl_auction_history")
        .select("player_id");
    const auctionedIds = new Set(history.map(h => h.player_id));
    console.log(`Auction history contains ${auctionedIds.size} unique player IDs.\n`);

    // 2. Get all currently assigned (non-UNSOLD, non-PASSED) registrations
    const { data: assigned } = await supabase
        .from("vpl_registrations")
        .select("account_id, team_name, price, is_captain")
        .eq("season", 2)
        .not("team_name", "in", '("UNSOLD","PASSED","")');

    // 3. Find stray assignments: assigned to a team but NOT in auction history AND NOT a captain
    const strayPlayers = assigned.filter(r => !auctionedIds.has(r.account_id) && !r.is_captain);
    
    if (strayPlayers.length === 0) {
        console.log("No stray players found. All assignments match auction history.");
    } else {
        console.log(`Found ${strayPlayers.length} stray player(s) to reset:`);
        for (const player of strayPlayers) {
            console.log(`  Resetting ${player.account_id} (was on "${player.team_name}" at ₹${player.price}) -> UNSOLD`);
            const { error } = await supabase
                .from("vpl_registrations")
                .update({ team_name: "UNSOLD", price: 0 })
                .eq("account_id", player.account_id)
                .eq("season", 2);
            if (error) {
                console.error(`    ERROR: ${error.message}`);
            } else {
                console.log(`    Done ✓`);
            }
        }
    }

    // 4. Recalculate and sync Redis purses
    console.log("\nRecalculating team purses...");
    const { data: teams } = await supabase.from("Team").select("id, name");
    const { data: allRegs } = await supabase
        .from("vpl_registrations")
        .select("team_name, price")
        .eq("season", 2);

    for (const team of teams) {
        const roster = allRegs.filter(r => r.team_name === team.name);
        const spent = roster.reduce((sum, r) => sum + (r.price || 0), 0);
        const correctPurse = Math.max(0, MAX_BUDGET - spent);
        await redis.hset("s2:team_purses", team.id, correctPurse);
        console.log(`  ${team.name}: ${roster.length} players, spent ₹${spent}, purse ₹${correctPurse}`);
    }

    // 5. Final verification
    console.log("\n=== FINAL VERIFICATION ===");
    const { data: finalRegs } = await supabase
        .from("vpl_registrations")
        .select("account_id, team_name, price, is_captain")
        .eq("season", 2)
        .not("team_name", "in", '("UNSOLD","PASSED","")');

    const finalByTeam = {};
    finalRegs.forEach(r => {
        if (!finalByTeam[r.team_name]) finalByTeam[r.team_name] = [];
        finalByTeam[r.team_name].push(r);
    });

    let allGood = true;
    Object.keys(finalByTeam).sort().forEach(tName => {
        const players = finalByTeam[tName];
        const captains = players.filter(p => p.is_captain);
        const auctioned = players.filter(p => !p.is_captain);
        const flag = auctioned.length === 7 ? "✓" : "⚠";
        if (auctioned.length !== 7) allGood = false;
        console.log(`  ${flag} ${tName}: ${auctioned.length} auctioned + ${captains.length} captain(s) = ${players.length} total`);
    });

    if (allGood) {
        console.log("\nAll teams have exactly 7 auctioned players. ✓");
    } else {
        console.log("\nSome teams have incorrect player counts!");
    }

    console.log("\n*** FIX COMPLETED ***");
    redis.disconnect();
}

run().catch(e => { console.error(e); redis.disconnect(); });
