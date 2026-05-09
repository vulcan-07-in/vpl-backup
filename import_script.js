const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Init Supabase (Using standard creds from the repo)
const supabase = createClient('https://dzufjnvaodzydcdtamkp.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6dWZqbnZhb2R6eWRjZHRhbWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTg3ODUsImV4cCI6MjA5MjgzNDc4NX0.g1I8WJUEJ0kaOhCwiDXpUGR-dMYsGB4Lq4iCxmjdR9U');

async function run() {
    try {
        console.log("Deleting old registrations...");
        await supabase.from('vpl_registrations').delete().neq('account_id', '0');
        await supabase.from('varchasva_accounts').delete().neq('account_id', '0');

        console.log("Reading raw_data.tsv...");
        const text = fs.readFileSync('raw_data.tsv', 'utf-8');
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        
        // Skip header
        const dataRows = lines.slice(1);
        console.log(`Found ${dataRows.length} data rows.`);

        let currentIdCounter = 1;
        let successCount = 0;
        let skipCount = 0;
        
        const usedMobiles = new Set();

        for (const line of dataRows) {
            const parts = line.split('\t');
            if (parts.length < 7) {
                console.log("Skipping invalid line:", line);
                skipCount++;
                continue;
            }

            const name = parts[1].trim();
            const rawMobile = parts[6].trim();
            const role = parts[4].trim();

            if (!name || !rawMobile) {
                console.log("Skipping empty name/mobile:", name);
                skipCount++;
                continue;
            }

            // Clean mobile
            let cleanMobile = rawMobile.replace(/[^0-9]/g, '');
            if (cleanMobile.startsWith('91') && cleanMobile.length > 10) {
                cleanMobile = cleanMobile.substring(2);
            }
            if (cleanMobile.length > 10) {
                 cleanMobile = cleanMobile.substring(0, 10);
            }
            
            // Deduplicate logic!
            if (usedMobiles.has(cleanMobile)) {
                 cleanMobile = cleanMobile + "-dup" + currentIdCounter;
            }
            usedMobiles.add(cleanMobile);

            const accountId = `VAR-${currentIdCounter.toString().padStart(3, '0')}`;
            currentIdCounter++;

            // Insert account
            const { error: accErr } = await supabase.from('varchasva_accounts').insert({
                account_id: accountId,
                name: name,
                mobile_number: cleanMobile
            });

            if (accErr) {
                console.error(`Failed to insert account ${name}:`, accErr);
                continue;
            }

            // Insert registration
            const { error: regErr } = await supabase.from('vpl_registrations').insert({
                registration_id: `VPL2-${accountId}`,
                account_id: accountId,
                season: 2,
                team_name: 'UNSOLD',
                role: role
            });

            if (regErr) {
                console.error(`Failed to insert registration ${name}:`, regErr);
            } else {
                successCount++;
            }
        }

        console.log(`\nDONE! Successfully inserted ${successCount} players. Skipped ${skipCount}.`);
        
    } catch (e) {
        console.error("Script error:", e);
    }
}

run();
