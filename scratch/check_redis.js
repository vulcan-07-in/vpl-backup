const Redis = require('ioredis');
const redis = new Redis('redis://default:uD7GwvUhGhqbItfAPgNkjxG5it6rHISv@redis-19355.crce263.ap-south-1-1.ec2.cloud.redislabs.com:19355');

async function check() {
    console.log("Checking VPL Redis cache...");
    try {
        const keys = await redis.keys('*');
        console.log(`Found ${keys.length} keys in Redis.`);
        for (const key of keys.slice(0, 50)) {
            const type = await redis.type(key);
            console.log(` - ${key} (${type})`);
            if (type === 'string') {
                const val = await redis.get(key);
                console.log(`   Value: ${val.substring(0, 100)}`);
            }
        }
    } catch (e) {
        console.error("Redis connection failed:", e);
    }
    process.exit(0);
}

check();
