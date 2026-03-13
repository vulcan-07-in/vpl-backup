import Redis from 'ioredis';
import { NextResponse } from 'next/server';
import { LiveMatchState } from '@/lib/tournament';

const redis = new Redis(process.env.REDIS_URL || '');

export async function GET() {
    try {
        const keys = await redis.keys('live_match_*');
        if (keys.length === 0) {
            return NextResponse.json({});
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

        return NextResponse.json(liveStates, {
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            },
        });
    } catch (error) {
        console.error('API GET All Live Scores Error:', error);
        return NextResponse.json({ error: 'Failed to fetch live scores' }, { status: 500 });
    }
}
