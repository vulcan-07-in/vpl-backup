import Redis from 'ioredis';
import { NextResponse } from 'next/server';
import { LiveMatchState } from '@/lib/tournament';
import { supabase } from '@/lib/supabase';

const redis = new Redis(process.env.REDIS_URL || '');

export async function GET() {
    try {
        const liveStates: Record<string, LiveMatchState> = {};

        // 1. Fetch persistent states from Supabase
        const { data: matches, error } = await supabase
            .from('Match')
            .select('matchNo, liveState, isFunMatch')
            .not('liveState', 'is', null);

        if (!error && matches) {
            matches.forEach(m => {
                const matchId = String(m.matchNo).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
                if (m.liveState) {
                    const state = m.liveState as unknown as LiveMatchState;
                    if (m.isFunMatch) state.isFunMatch = true;
                    liveStates[matchId] = state;
                }
            });
        } else if (error) {
            console.error('Supabase GET All Live Scores Error:', error);
        }

        // 2. Override with fresh data from Redis
        const keys = await redis.keys('s2:live_match_*');
        if (keys.length > 0) {
            const values = await redis.mget(...keys);
            keys.forEach((key, i) => {
                const rawMatchId = key.replace('s2:live_match_', '');
                const matchId = String(rawMatchId).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
                const data = values[i];
                if (data) {
                    const parsed = JSON.parse(data);
                    if (liveStates[matchId]?.isFunMatch) {
                        parsed.isFunMatch = true;
                    }
                    liveStates[matchId] = parsed;
                }
            });
        }

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
