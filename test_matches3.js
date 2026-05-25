const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envContent.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].replace(/['"]/g, '').trim();
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].replace(/['"]/g, '').trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: matches, error } = await supabase.from('Match').select('matchNo, stage, group, team1Id, team2Id, liveState');
  if (error) {
    console.error("Error fetching matches:", error);
    return;
  }
  
  const { data: teams } = await supabase.from('Team').select('id, name, groupId');
  const teamMap = {};
  teams.forEach(t => teamMap[t.id] = t);

  matches.forEach(m => {
    const t1 = teamMap[m.team1Id];
    const t2 = teamMap[m.team2Id];
    console.log(`Match: ${m.matchNo} | Group: ${m.group} | T1: ${t1?.name} (${t1?.groupId}) | T2: ${t2?.name} (${t2?.groupId}) | HasLiveState: ${!!m.liveState}`);
  });
}
main();
