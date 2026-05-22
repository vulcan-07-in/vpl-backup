const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const Redis = require('ioredis');

// Parse .env.local for credentials
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

if (!supabaseServiceRoleKey) {
    console.error("CRITICAL: SUPABASE_SERVICE_ROLE_KEY not found in .env.local!");
    process.exit(1);
}
if (!redisUrl) {
    console.error("CRITICAL: REDIS_URL not found in .env.local!");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const redis = new Redis(redisUrl);

// VPL Constants
const MAX_BUDGET = 10000;
const teamPursesKey = () => "s2:team_purses";

async function run() {
    try {
        console.log("Starting full data restoration process...\n");

        // 1. Fetch all teams to map IDs to Names
        console.log("Fetching team metadata...");
        const { data: teams, error: teamsErr } = await supabase
            .from("Team")
            .select("id, name");
        if (teamsErr) throw new Error(`Failed to fetch teams: ${teamsErr.message}`);
        
        const teamMap = {}; // id -> name
        const teamIdByName = {}; // name -> id
        teams.forEach(t => {
            teamMap[t.id] = t.name;
            teamIdByName[t.name.toLowerCase().trim()] = t.id;
        });
        console.log(`Loaded ${teams.length} teams.`);

        // 2. Fetch all winning bid logs from auction history
        console.log("Fetching live auction transaction logs...");
        const { data: history, error: histErr } = await supabase
            .from("vpl_auction_history")
            .select("*")
            .order("timestamp", { ascending: true });
        if (histErr) throw new Error(`Failed to fetch history: ${histErr.message}`);
        console.log(`Loaded ${history.length} completed live draft transactions.\n`);

        // 3. Reconstruct players
        console.log("Processing and restoring players to their squads...");
        let wildcardsCreated = 0;
        let playersRestored = 0;

        for (const bid of history) {
            const playerId = bid.player_id;
            const bidAmount = bid.bid_amount;
            const teamId = bid.team_id;
            const teamName = teamMap[teamId];

            if (!teamName) {
                console.warn(`Warning: Team with ID ${teamId} not found in database for player ${playerId}`);
                continue;
            }

            // A. Check if the player account exists
            const { data: account, error: accCheckErr } = await supabase
                .from("varchasva_accounts")
                .select("account_id")
                .eq("account_id", playerId)
                .maybeSingle();

            if (accCheckErr) {
                console.error(`Error checking account ${playerId}:`, accCheckErr.message);
                continue;
            }

            // B. If custom player (VAR-078 to VAR-080) is missing, recreate it
            if (!account) {
                console.log(`Reconstructing missing wildcard account: ${playerId}...`);
                const num = playerId.replace(/[^0-9]/g, '');
                const placeholderName = `Wildcard Player ${num}`;
                const placeholderMobile = `9999999${num.padStart(3, '0').slice(-3)}`;

                // Create account record
                const { error: accInsErr } = await supabase
                    .from("varchasva_accounts")
                    .insert({
                        account_id: playerId,
                        name: placeholderName,
                        mobile_number: placeholderMobile
                    });

                if (accInsErr) {
                    console.error(`Failed to create account ${playerId}:`, accInsErr.message);
                    continue;
                }

                // Create registration record
                const { error: regInsErr } = await supabase
                    .from("vpl_registrations")
                    .insert({
                        registration_id: `VPL2-${playerId}`,
                        account_id: playerId,
                        season: 2,
                        team_name: 'UNSOLD',
                        role: 'All Rounder'
                    });

                if (regInsErr) {
                    console.error(`Failed to create registration ${playerId}:`, regInsErr.message);
                    continue;
                }

                wildcardsCreated++;
            }

            // C. Assign the player to their drafted team with sold price
            const { error: updateErr } = await supabase
                .from("vpl_registrations")
                .update({
                    team_name: teamName,
                    price: bidAmount
                })
                .eq("account_id", playerId)
                .eq("season", 2);

            if (updateErr) {
                console.error(`Failed to assign player ${playerId} to ${teamName}:`, updateErr.message);
            } else {
                playersRestored++;
            }
        }

        console.log(`\nSquads restored successfully:`);
        console.log(` - Wildcard accounts reconstructed: ${wildcardsCreated}`);
        console.log(` - Players assigned to drafted squads: ${playersRestored}`);

        // 4. Synchronize all team purses in Redis
        console.log("\nSynchronizing team budgets in Redis...");
        
        // Fetch all active registrations to calculate final sums
        const { data: allRegs, error: regsErr } = await supabase
            .from("vpl_registrations")
            .select("team_name, price")
            .eq("season", 2);
            
        if (regsErr) throw new Error(`Failed to fetch final registrations: ${regsErr.message}`);

        for (const team of teams) {
            const teamRoster = allRegs.filter(r => r.team_name === team.name);
            const spent = teamRoster.reduce((sum, r) => sum + (r.price || 0), 0);
            const correctPurse = Math.max(0, MAX_BUDGET - spent);
            
            // Set in Redis
            await redis.hset(teamPursesKey(), team.id, correctPurse);
            console.log(` - Team: ${team.name} | Spent: ${spent} | Remaining Purse: ${correctPurse}`);
        }

        console.log("\nRedis purse budgets synchronized successfully!");
        console.log("\n*** RESTORATION COMPLETED SUCCESSFULLY! ***");

    } catch (e) {
        console.error("\nCRITICAL RESTORATION ERROR:", e.message);
    } finally {
        redis.disconnect();
    }
}

run();
