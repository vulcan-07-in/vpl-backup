
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const match = envContent.match(/GOOGLE_SERVICE_ACCOUNT_JSON=(.+)/);
if (!match) {
    console.log("No match found");
} else {
    let raw = match[1].trim();
    console.log("Raw first 10 chars:", raw.substring(0, 10));
    console.log("Raw last 10 chars:", raw.substring(raw.length - 10));
    
    let cleaned = raw;
    if ((cleaned.startsWith("'") && cleaned.endsWith("'")) || (cleaned.startsWith('"') && cleaned.endsWith('"'))) {
        cleaned = cleaned.substring(1, cleaned.length - 1);
    }
    
    try {
        JSON.parse(cleaned);
        console.log("Parsed successfully!");
    } catch (e) {
        console.error("Parse failed!");
        console.error(e.message);
        const pos = parseInt(e.message.match(/position (\d+)/)?.[1] || "0");
        console.log("Error at position:", pos);
        console.log("Context:", cleaned.substring(Math.max(0, pos - 20), Math.min(cleaned.length, pos + 20)));
    }
}
