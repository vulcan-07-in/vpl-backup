const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://dzufjnvaodzydcdtamkp.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6dWZqbnZhb2R6eWRjZHRhbWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTg3ODUsImV4cCI6MjA5MjgzNDc4NX0.g1I8WJUEJ0kaOhCwiDXpUGR-dMYsGB4Lq4iCxmjdR9U');

async function restore() {
    try {
        console.log("=== STARTING SQUADS RESTORATION ===");
        
        // 1. Fetch all accounts from database to map name -> account_id
        const { data: accounts, error: accErr } = await supabase
            .from('varchasva_accounts')
            .select('account_id, name');
        
        if (accErr) throw accErr;
        console.log(`Loaded ${accounts.length} player accounts from database.`);

        // Build a normalized name mapping
        const nameMap = {};
        accounts.forEach(acc => {
            const normalized = acc.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            nameMap[normalized] = acc;
        });

        // 2. Read and parse squads CSV
        const csvContent = fs.readFileSync('scratch/squads_backup.csv', 'utf-8');
        const lines = csvContent.split('\n').filter(l => l.trim().length > 0);
        
        // Skip header
        const rows = lines.slice(1);
        
        let updateCount = 0;
        let skipCount = 0;

        for (const row of rows) {
            // Split by comma, but handle quotes around the Players column
            const match = row.match(/^([^,]+),([^,]+),([^,]+),"([^"]+)"/);
            if (!match) {
                console.log("Skipping invalid CSV line:", row);
                continue;
            }

            const teamName = match[1].trim();
            const playersStr = match[4].trim();

            console.log(`\nProcessing Team: ${teamName}...`);

            // Split players
            const playersList = playersStr.split(',').map(p => p.trim());
            
            for (let i = 0; i < playersList.length; i++) {
                const playerPart = playersList[i]; // e.g. "Anupam Ghule:All Rounder:1000"
                const parts = playerPart.split(':');
                if (parts.length < 3) {
                    console.log(`Skipping invalid player entry "${playerPart}"`);
                    continue;
                }

                const playerName = parts[0].trim();
                const role = parts[1].trim();
                const price = parseInt(parts[2].trim(), 10);
                const isCaptain = (i === 0); // First player is captain

                // Normalize name for lookup
                const normName = playerName.toLowerCase().replace(/[^a-z0-9]/g, '');
                
                // Try fuzzy lookup
                let targetAccount = nameMap[normName];
                if (!targetAccount) {
                    // Fallback to substring matching if exact match fails
                    targetAccount = accounts.find(acc => {
                        const dbNorm = acc.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                        return dbNorm.includes(normName) || normName.includes(dbNorm);
                    });
                }

                if (!targetAccount) {
                    console.error(`❌ Could not find account for player: "${playerName}" in team: "${teamName}"`);
                    skipCount++;
                    continue;
                }

                console.log(` -> Found account [${targetAccount.account_id}] for "${playerName}". Restoring to ${teamName} (Price: ${price}, Captain: ${isCaptain})`);

                // Update registration
                const { error: updateErr } = await supabase
                    .from('vpl_registrations')
                    .update({
                        team_name: teamName,
                        role: role,
                        price: price,
                        is_captain: isCaptain,
                        is_approved: true
                    })
                    .eq('account_id', targetAccount.account_id)
                    .eq('season', 2);

                if (updateErr) {
                    console.error(`Failed to update registration for ${playerName}:`, updateErr);
                    skipCount++;
                } else {
                    updateCount++;
                }
            }
        }

        console.log(`\n=== RESTORATION COMPLETED ===`);
        console.log(`Successfully restored: ${updateCount} players.`);
        console.log(`Skipped / Failed: ${skipCount} players.`);

    } catch (e) {
        console.error("Restore failed with error:", e);
    }
}

restore();
