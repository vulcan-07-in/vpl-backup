import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.log("Starting migration of custom players...");

    // 1. Fetch all players from the Player table
    const { data: players, error: playerErr } = await supabase.from('Player').select('*');
    if (playerErr) {
        console.error("Failed to fetch players:", playerErr);
        return;
    }

    if (!players || players.length === 0) {
        console.log("No custom players to migrate.");
        return;
    }

    // 2. Fetch all teams to map teamId to teamName
    const { data: teams, error: teamErr } = await supabase.from('Team').select('id, name');
    if (teamErr) {
        console.error("Failed to fetch teams:", teamErr);
        return;
    }

    const teamMap = {};
    teams.forEach(t => teamMap[t.id] = t.name);

    let successCount = 0;

    for (const player of players) {
        const teamName = teamMap[player.teamId];
        if (!teamName) {
            console.error(`Team not found for player ${player.name} (Team ID: ${player.teamId}). Skipping.`);
            continue;
        }

        const accountId = `CUST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

        // Insert into varchasva_accounts
        const { error: accErr } = await supabase.from('varchasva_accounts').insert({
            account_id: accountId,
            name: player.name,
        });

        if (accErr) {
            console.error(`Failed to create account for ${player.name}:`, accErr.message);
            continue;
        }

        // Insert into vpl_registrations
        const { error: regErr } = await supabase.from('vpl_registrations').insert({
            registration_id: `REG-${accountId}`,
            account_id: accountId,
            season: 2,
            team_name: teamName,
            role: player.role,
            price: player.price || 0,
            is_approved: true,
            is_captain: false,
            tier: "CUSTOM"
        });

        if (regErr) {
            console.error(`Failed to register ${player.name}:`, regErr.message);
            // Rollback account creation just in case
            await supabase.from('varchasva_accounts').delete().eq('account_id', accountId);
            continue;
        }

        // If successful, delete from Player table to prevent duplicates
        const { error: delErr } = await supabase.from('Player').delete().eq('id', player.id);
        if (delErr) {
            console.error(`Failed to delete legacy player ${player.name}:`, delErr.message);
        } else {
            successCount++;
            console.log(`Migrated: ${player.name} -> ${teamName} (Account ID: ${accountId})`);
        }
    }

    console.log(`Migration complete. Successfully migrated ${successCount}/${players.length} players.`);
}

main();
