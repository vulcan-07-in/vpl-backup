const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(REDIS_URL);

const SHEET_ID = "12cbvXQkyWZWor1EYPCUljKi6so1-CANOgyQUzwZFgro";
const FIXTURES_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=1008778926`;
const SQUADS_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=667574756`;

async function fetchCSV(url) {
    const response = await fetch(url);
    return await response.text();
}

function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        return headers.reduce((obj, header, i) => {
            obj[header] = values[i];
            return obj;
        }, {});
    });
}

function generateInnings(teamName, overs = 8) {
    const runs = Math.floor(Math.random() * 60) + 40;
    const wickets = Math.floor(Math.random() * 8);
    const innings = {
        teamName,
        runs,
        wickets,
        overs: wickets === 8 ? overs : parseFloat((Math.floor(Math.random() * (overs - 1)) + Math.random()).toFixed(1)),
        batsmen: {
            "Player 1": { name: "Player 1", runs: 20, balls: 15, fours: 2, sixes: 1, isOut: true },
            "Player 2": { name: "Player 2", runs: runs - 20, balls: 20, fours: 4, sixes: 2, isOut: false }
        },
        bowlers: {
            "Bowler 1": { name: "Bowler 1", overs: 2, maidens: 0, runs: 15, wickets: 2 },
            "Bowler 2": { name: "Bowler 2", overs: 2, maidens: 0, runs: 20, wickets: 1 }
        }
    };
    return innings;
}

async function simulate() {
    console.log("🚀 Starting Tournament Simulation...");

    // 1. Fetch Data
    const fixturesRaw = await fetchCSV(FIXTURES_CSV_URL);
    const fixtures = parseCSV(fixturesRaw).filter(f => f.MatchNo);
    console.log(`✅ Loaded ${fixtures.length} fixtures.`);

    // 2. Clear Redis
    await redis.del('active_live_match_id');
    const keys = await redis.keys('live_match_*');
    if (keys.length > 0) await redis.del(...keys);
    console.log("🧹 Redis Cleared.");

    const standings = {}; // Simple local tracker for mock knockout resolution

    for (let i = 0; i < fixtures.length; i++) {
        const f = fixtures[i];
        const matchId = f.MatchNo;
        
        let team1 = f.Team1;
        let team2 = f.Team2;

        // Mock resolution for Knockouts if they contain placeholders
        if (team1.includes("Group") || team1.includes("Winner")) {
            // Very simple mock: pick random teams for knockouts if they aren't resolved in CSV
            // In a real simulation, we'd calculate standings properly.
            // But for a UI test, any teams will do as long as they aren't placeholders.
            team1 = "Saberwolves"; 
            team2 = "Dominators";
        }

        console.log(`🏏 Simulating ${matchId}: ${team1} vs ${team2}...`);

        const inn1 = generateInnings(team1);
        const inn2 = generateInnings(team2);
        
        // Determine winner
        let winner = inn1.runs > inn2.runs ? team1 : (inn2.runs > inn1.runs ? team2 : "TIE");
        let result = winner === "TIE" ? "Match Tied" : `${winner} won by ${Math.abs(inn1.runs - inn2.runs)} runs`;

        const state = {
            matchId,
            status: "COMPLETED",
            currentInnings: 2,
            innings1: inn1,
            innings2: inn2,
            timeline: [{ id: "b1", timestamp: Date.now(), innings: 1, over: 0.1, striker: "P1", nonStriker: "P2", bowler: "B1", runs: 1, extras: 0, isWicket: false }],
            matchOvers: 8,
            winner,
            result
        };

        await redis.set(`live_match_${matchId}`, JSON.stringify(state));
    }

    console.log("✨ Simulation Complete! All 15 matches populated.");
    process.exit(0);
}

simulate().catch(err => {
    console.error("❌ Simulation Failed:", err);
    process.exit(1);
});
