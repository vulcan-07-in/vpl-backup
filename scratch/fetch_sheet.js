const SHEET_ID = "12cbvXQkyWZWor1EYPCUljKi6so1-CANOgyQUzwZFgro";
const SQUADS_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=667574756`;
const FIXTURES_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=1008778926`;

async function run() {
    console.log("Fetching squads from Google Sheet...");
    try {
        const sqRes = await fetch(SQUADS_CSV_URL);
        const sqText = await sqRes.text();
        console.log("First 300 chars of squads:");
        console.log(sqText.substring(0, 300));
        
        const fixRes = await fetch(FIXTURES_CSV_URL);
        const fixText = await fixRes.text();
        console.log("\nFirst 300 chars of fixtures:");
        console.log(fixText.substring(0, 300));
    } catch (e) {
        console.error("Error fetching sheet:", e);
    }
}

run();
