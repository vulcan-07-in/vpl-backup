/**
 * Run this once to properly format your service account JSON into .env.local
 * Usage: node scripts/setup-credentials.js path/to/your-service-account.json
 */

const fs = require("fs");
const path = require("path");

const jsonPath = process.argv[2];
if (!jsonPath) {
    console.error("Usage: node scripts/setup-credentials.js path/to/service-account.json");
    process.exit(1);
}

const absPath = path.resolve(jsonPath);
if (!fs.existsSync(absPath)) {
    console.error("File not found:", absPath);
    process.exit(1);
}

// Read and minify to single line
const credentials = JSON.parse(fs.readFileSync(absPath, "utf-8"));
const singleLine = JSON.stringify(credentials); // minified, single line

// Read or create .env.local
const envPath = path.join(__dirname, "..", ".env.local");
let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";

// Replace or append GOOGLE_SERVICE_ACCOUNT_JSON line
const key = "GOOGLE_SERVICE_ACCOUNT_JSON";
const newLine = `${key}=${singleLine}`;

if (envContent.includes(key)) {
    envContent = envContent.replace(new RegExp(`^${key}=.*$`, "m"), newLine);
} else {
    envContent += `\n${newLine}\n`;
}

fs.writeFileSync(envPath, envContent);
console.log("✅ .env.local updated with service account credentials");
console.log("   Restart your dev server: npm run dev");
