const fs = require('fs');
const files = [
  'src/app/page.tsx', 
  'src/app/points/page.tsx', 
  'src/app/matches/page.tsx', 
  'src/app/matches/[matchId]/page.tsx', 
  'src/app/squads/page.tsx', 
  'src/app/live/page.tsx', 
  'src/app/scorer/page.tsx', 
  'src/app/api/squads/route.ts', 
  'src/app/api/matches/route.ts', 
  'src/components/ChampionBanner.tsx'
];

files.forEach(f => {
  try {
    let c = fs.readFileSync(f, 'utf8');
    
    // Only modify the import statements!
    if (c.includes('@/lib/tournament')) {
        let lines = c.split('\n');
        let newLines = [];
        let addedDataImport = false;
        
        for (let line of lines) {
            if (line.includes('from "@/lib/tournament"') || line.includes("from '@/lib/tournament'")) {
                let hasDataFetchers = false;
                if (line.includes('fetchFixtures')) { hasDataFetchers = true; line = line.replace(/fetchFixtures,?/g, ''); }
                if (line.includes('fetchTeams')) { hasDataFetchers = true; line = line.replace(/fetchTeams,?/g, ''); }
                if (line.includes('fetchSquads')) { hasDataFetchers = true; line = line.replace(/fetchSquads,?/g, ''); }
                
                // Add the data import if needed
                if (hasDataFetchers && !addedDataImport) {
                    newLines.push('import { fetchFixtures, fetchTeams, fetchSquads } from "@/lib/data";');
                    addedDataImport = true;
                }
                
                // Clean up empty imports or trailing commas
                line = line.replace(/{\s*,/g, '{').replace(/,\s*}/g, '}');
                
                if (!line.match(/{\s*}/)) {
                    newLines.push(line);
                }
            } else {
                newLines.push(line);
            }
        }
        
        fs.writeFileSync(f, newLines.join('\n'));
        console.log('Updated imports in ' + f);
    }
  } catch(e){
    console.error('Error on ' + f + ': ' + e.message);
  }
});
