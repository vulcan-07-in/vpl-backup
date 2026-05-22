const Redis = require('ioredis');
const redis = new Redis('redis://default:uD7GwvUhGhqbItfAPgNkjxG5it6rHISv@redis-19355.crce263.ap-south-1-1.ec2.cloud.redislabs.com:19355');

async function check() {
    console.log("Checking s2 Redis keys...");
    try {
        const purses = await redis.hgetall('s2:team_purses');
        console.log("s2:team_purses:", purses);

        const paddles = await redis.hgetall('s2:team_paddles');
        console.log("s2:team_paddles:", paddles);

        const activeMatchId = await redis.get('s2:active_live_match_id');
        console.log("s2:active_live_match_id:", activeMatchId);

        if (activeMatchId) {
            const matchData = await redis.get(`s2:live_match_${activeMatchId}`) || await redis.get(`s2:completed_match_${activeMatchId}`);
            console.log(`s2 match ${activeMatchId} data:`, matchData ? matchData.substring(0, 500) : "not found");
        }
    } catch (e) {
        console.error("Redis query failed:", e);
    }
    process.exit(0);
}

check();
