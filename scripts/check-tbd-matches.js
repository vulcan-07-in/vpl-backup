const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { data: matches } = await supabase.from('Match').select('*').order('matchNo', { ascending: true });
    const { data: teams } = await supabase.from('Team').select('id, name');
    
    const idToName = {};
    teams.forEach(t => idToName[t.id] = t.name);

    for (const m of matches) {
        const t1 = idToName[m.team1Id];
        const t2 = idToName[m.team2Id];
        const w = m.winnerId ? idToName[m.winnerId] : null;
        if (t1 === 'TBD' || t2 === 'TBD' || w === 'TBD' || m.liveState?.winner === 'TBD') {
            console.log(`Match ${m.matchNo} - Stage: ${m.stage}, T1: ${t1}, T2: ${t2}, W: ${w}, LiveWinner: ${m.liveState?.winner}`);
            if (m.liveState) {
                console.log(`LiveResult: ${m.liveState.result}`);
                console.log(`Inn1 Team: ${m.liveState.innings1.teamName}, Inn2 Team: ${m.liveState.innings2.teamName}`);
            }
        }
    }
}

main().catch(console.error);
