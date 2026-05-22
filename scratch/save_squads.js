const fs = require('fs');

const SHEET_ID = "12cbvXQkyWZWor1EYPCUljKi6so1-CANOgyQUzwZFgro";
const SQUADS_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=667574756`;

async function run() {
    console.log("Downloading squads CSV...");
    const res = await fetch(SQUADS_CSV_URL);
    const text = await res.text();
    fs.writeFileSync('scratch/squads_backup.csv', text, 'utf-8');
    console.log("Saved scratch/squads_backup.csv. Lines:", text.split('\n').length);
}

run();
