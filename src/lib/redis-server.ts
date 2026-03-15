import Redis from 'ioredis';
import { LiveMatchState } from '@/lib/tournament';

const redis = new Redis(process.env.REDIS_URL || '');

export async function getAllLiveStates(): Promise<Record<string, LiveMatchState>> {
    try {
        const keys = await redis.keys('live_match_*');
        if (keys.length === 0) {
            return {};
        }

        const values = await redis.mget(...keys);
        const liveStates: Record<string, LiveMatchState> = {};

        keys.forEach((key, i) => {
            const matchId = key.replace('live_match_', '');
            const data = values[i];
            if (data) {
                liveStates[matchId] = JSON.parse(data);
            }
        });

        return liveStates;
    } catch (error) {
        console.error('Redis fetch all live states error:', error);
        return {};
    }
}
