import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';

// Manual .env.local parsing to avoid dependency issues
function loadEnv() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) return;

    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim().replace(/^"|"$/g, '');
            process.env[key.trim()] = value;
        }
    });
}

loadEnv();

const redis = new Redis(process.env.REDIS_URL || '');

async function clearData() {
    console.log("Cleaning up Redis data...");

    const keys = await redis.keys('live_match_*');
    if (keys.length > 0) {
        console.log(`Deleting ${keys.length} match keys...`);
        await redis.del(...keys);
    } else {
        console.log("No live_match_* keys found.");
    }

    await redis.del('active_live_match_id');
    console.log("Deleted active_live_match_id key.");

    console.log("Cleanup complete.");
    process.exit(0);
}

clearData().catch(err => {
    console.error("Error clearing data:", err);
    process.exit(1);
});
